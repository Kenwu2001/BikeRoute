# -*- coding: utf-8 -*-
"""
TDX API 相關功能
處理 YouBike 站點資訊的取得和處理
"""

import requests
import pandas as pd
import json
import time

import os

#  for local development
# from env.config import (
#     TDX_CLIENT_ID, 
#     TDX_CLIENT_SECRET, 
#     TDX_AUTH_URL, 
#     TDX_AVAILABILITY_URL, 
#     TDX_STATION_URL
# )


class TDXBikeAPI:
    def __init__(self):
        TDX_CLIENT_ID = os.getenv("TDX_CLIENT_ID")
        TDX_CLIENT_SECRET = os.getenv("TDX_CLIENT_SECRET")
        TDX_AUTH_URL = os.getenv("TDX_AUTH_URL")
        TDX_AVAILABILITY_URL = os.getenv("TDX_AVAILABILITY_URL")
        TDX_STATION_URL = os.getenv("TDX_STATION_URL")
        self.access_token = None
        self.token_expire_time = 0
        self.headers = None
        self._authenticate()

    def _authenticate(self):
        """取得 TDX API 的存取權杖（含快取與到期檢查）"""
        if self.access_token and time.time() < self.token_expire_time:
            return  # 使用快取 token

        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        data = {
            'grant_type': 'client_credentials',
            'client_id': TDX_CLIENT_ID,
            'client_secret': TDX_CLIENT_SECRET
        }

        response = requests.post(TDX_AUTH_URL, headers=headers, data=data)

        if response.status_code == 200:
            token_data = response.json()
            self.access_token = token_data['access_token']
            self.token_expire_time = time.time() + token_data['expires_in'] - 60
            self.headers = {
                'Authorization': 'Bearer ' + self.access_token
            }
        else:
            raise Exception(f"TDX 認證失敗: {response.status_code}")

    def get_data(self, url):
        """從 TDX API 取得資料"""
        self._authenticate()
        response = requests.get(url, headers=self.headers)

        if response.status_code == 200:
            text = response.content.decode('utf-8-sig')
            lines = text.strip().split('\n')
            data = [json.loads(line) for line in lines]
            return pd.DataFrame(data[0])
        else:
            raise Exception(f"API 呼叫失敗: {response.status_code}")

    def get_bike_info(self):
        """取得合併後的 YouBike 資訊"""
        availability = self.get_data(TDX_AVAILABILITY_URL)
        st_info = self.get_data(TDX_STATION_URL)

        st_info_trimmed = st_info[['StationUID']].copy()
        st_info_trimmed['lat'] = st_info['StationPosition'].apply(lambda x: x['PositionLat'])
        st_info_trimmed['lng'] = st_info['StationPosition'].apply(lambda x: x['PositionLon'])
        st_info_trimmed['address'] = st_info['StationAddress'].apply(lambda x: x['Zh_tw'])

        availability['RentGeneralBikes'] = availability['AvailableRentBikesDetail'].apply(lambda x: x['GeneralBikes'])
        availability['RentElectricBikes'] = availability['AvailableRentBikesDetail'].apply(lambda x: x['ElectricBikes'])

        bike_info = pd.merge(
            availability[['StationUID', 'AvailableRentBikes', 'AvailableReturnBikes', 'RentGeneralBikes', 'RentElectricBikes']],
            st_info_trimmed[['StationUID', 'address', 'lat', 'lng']],
            on='StationUID',
            how='left'
        )

        return bike_info

    def get_availability_data(self):
        """僅取得可借／可還資料"""
        return self.get_data(TDX_AVAILABILITY_URL)

    def get_station_info_by_uid(self, station_uid: str):
        """查詢單一站點的可借可還狀況"""
        df = self.get_availability_data()
        result = df[df['StationUID'] == station_uid]
        if result.empty:
            return None
        return result.iloc[0].to_dict()

    def get_available_return_stations(self):
        """取得所有可還車的站點（AvailableReturnBikes > 0）"""
        df = self.get_bike_info()
        return df[df['AvailableReturnBikes'] > 0]

    def to_geojson(self, df: pd.DataFrame):
        """將站點資料轉為 GeoJSON 格式"""
        features = []
        for _, row in df.iterrows():
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [row['lng'], row['lat']]
                },
                "properties": {
                    "station_uid": row['StationUID'],
                    "available_bikes": row['AvailableRentBikes'],
                    "available_return": row['AvailableReturnBikes'],
                    "general_bikes": row.get('RentGeneralBikes', 0),
                    "electric_bikes": row.get('RentElectricBikes', 0),
                    "address": row['address']
                }
            })
        return {
            "type": "FeatureCollection",
            "features": features
        }
