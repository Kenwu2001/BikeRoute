# -*- coding: utf-8 -*-
"""
共用工具函數
包含距離計算、座標處理等功能
"""

import numpy as np
import folium


def haversine(lat1, lon1, lat2, lon2):
    """
    使用 Haversine 公式計算球面距離
    
    :param lat1: float, 起點緯度
    :param lon1: float, 起點經度
    :param lat2: float, 終點緯度
    :param lon2: float, 終點經度
    :return: float, 距離（公里）
    """
    R = 6371  # 地球半徑 (公里)
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)

    a = np.sin(dphi/2)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda/2)**2
    return 2 * R * np.arcsin(np.sqrt(a))


def split_coordinates(coordinates):
    """
    分割座標字串為緯度和經度
    
    :param coordinates: str, 座標字串 "緯度,經度"
    :return: tuple, (緯度, 經度)
    """
    parts = coordinates.split(',')
    return float(parts[0].strip()), float(parts[1].strip())


def get_closest_stations(bike_info, lat, lng, num_stations=10, location='origin'):
    """
    找出最近的 YouBike 站點
    
    :param bike_info: pandas.DataFrame, 站點資訊
    :param lat: float, 目標緯度
    :param lng: float, 目標經度
    :param num_stations: int, 回傳的站點數量
    :param location: str, 位置標識 ('origin' 或 'dest')
    :return: pandas.DataFrame, 最近的站點資訊
    """
    bike_info_copy = bike_info.copy()
    bike_info_copy[f'distance_to_{location}'] = bike_info_copy.apply(
        lambda row: haversine(lat, lng, row['lat'], row['lng']),
        axis=1
    )
    
    return bike_info_copy.sort_values(f'distance_to_{location}').head(num_stations)


def create_route_map(points_segments, segment_info):
    """
    建立路線地圖
    
    :param points_segments: list, 路線段落列表 [points1, points2, points3]
    :param segment_info: list, 段落資訊列表 [{'color': 'green', 'tooltip': '走路', 'marker': '起點'}, ...]
    :return: folium.Map, 地圖物件
    """
    # 設定地圖中心（以第一個點為中心）
    start_lat, start_lng = points_segments[0][0]
    m = folium.Map(location=[start_lat, start_lng], zoom_start=13)
    
    # 添加標記點
    all_points = []
    for points in points_segments:
        all_points.extend([points[0], points[-1]])
    
    # 去除重複的點（相鄰段落的連接點）
    unique_markers = [all_points[0]]  # 起點
    for i in range(1, len(points_segments)):
        unique_markers.append(points_segments[i][-1])  # 每段的終點
    
    marker_labels = ['起點', '借車站（A）', '還車站（B）', '終點']
    marker_colors = ['red', 'green', 'orange', 'red']
    
    for i, (point, label, color) in enumerate(zip(unique_markers, marker_labels, marker_colors)):
        folium.Marker(
            point, 
            tooltip=label,
            icon=folium.Icon(color=color)
        ).add_to(m)
    
    # 畫出路線
    colors = ['green', 'blue', 'green']
    tooltips = ['走路到 A 站', '騎車到 B 站', '走路到目的地']
    
    for points, color, tooltip in zip(points_segments, colors, tooltips):
        folium.PolyLine(
            points, 
            color=color, 
            weight=5, 
            opacity=0.7, 
            tooltip=tooltip
        ).add_to(m)
    
    return m


def coordinates_to_string(lat, lng):
    """
    將座標轉換為字串格式
    
    :param lat: float, 緯度
    :param lng: float, 經度
    :return: str, 座標字串
    """
    return f"{lat},{lng}"