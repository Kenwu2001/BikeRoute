# -*- coding: utf-8 -*-
"""
Google Maps API 相關功能
處理路線規劃和導航
"""

import requests
import polyline
from config import GOOGLE_API_KEY


class GoogleMapsAPI:
    def __init__(self):
        self.api_key = GOOGLE_API_KEY
    
    def get_directions(self, origin, destination, mode='driving'):
        """
        取得路線規劃資訊
        
        :param origin: str, 起點座標 (lat,lng) 或地址
        :param destination: str, 終點座標 (lat,lng) 或地址
        :param mode: str, 交通方式 ('driving', 'walking', 'bicycling', 'transit')
        :return: tuple, (路線點列表, 預估時間文字, 預估時間秒數)
        """
        url = f"https://maps.googleapis.com/maps/api/directions/json?origin={origin}&destination={destination}&mode={mode}&key={self.api_key}"
        
        response = requests.get(url)
        data = response.json()
        
        if data['status'] != 'OK':
            raise Exception(f"Google Maps API 呼叫失敗: {data['status']}")
        
        # 擷取路徑
        route = data['routes'][0]['overview_polyline']['points']
        # 解碼 polyline 成為經緯度
        points = polyline.decode(route)
        
        # 取出預估時間
        duration_text = data['routes'][0]['legs'][0]['duration']['text']
        duration_value = data['routes'][0]['legs'][0]['duration']['value']  # 秒數
        
        return points, duration_text, duration_value
    
    def get_multiple_routes(self, waypoints, modes):
        """
        取得多段路線規劃
        
        :param waypoints: list, 路徑點列表 [(起點, 終點1), (終點1, 終點2), ...]
        :param modes: list, 對應的交通方式列表
        :return: tuple, (合併的路線點, 合併的時間文字, 總時間秒數)
        """
        all_points = []
        duration_texts = []
        total_duration = 0
        
        for (origin, destination), mode in zip(waypoints, modes):
            points, duration_text, duration_value = self.get_directions(origin, destination, mode)
            all_points.extend(points)
            duration_texts.append(duration_text)
            total_duration += duration_value
        
        combined_duration_text = ' + '.join(duration_texts)
        
        return all_points, combined_duration_text, total_duration