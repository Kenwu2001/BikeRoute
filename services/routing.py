from services.tdx import TDXBikeAPI
from services.gmaps import GoogleMapsAPI


class RoutingService:
    def __init__(self):
        self.bike_api = TDXBikeAPI()
        self.gmap_api = GoogleMapsAPI()

    def find_best_return_station(self, user_coord, destination_coord, top_k=5):
        """
        找出距離目的地最近的可還車站點，並規劃路線
        :param user_coord: tuple(float, float), 使用者目前位置
        :param destination_coord: tuple(float, float), 目的地位置
        :param top_k: int, 取幾個最近可還車點做評估
        :return: dict, 包含推薦站點資訊與路線資訊
        """
        # Step 1: 抓取所有可還車站點
        available_stations = self.bike_api.get_available_return_stations()

        # Step 2: 計算每個站點到目的地的直線距離（先快速過濾最近幾個）
        available_stations['dest_dist'] = available_stations.apply(
            lambda row: ((row['lat'] - destination_coord[0])**2 + (row['lng'] - destination_coord[1])**2)**0.5,
            axis=1
        )
        nearby_stations = available_stations.nsmallest(top_k, 'dest_dist')

        # Step 3: 使用 Google Maps 分別計算：user → station（騎車） + station → destination（步行）
        candidates = []
        for _, row in nearby_stations.iterrows():
            station_coord = f"{row['lat']},{row['lng']}"
            user_coord_str = f"{user_coord[0]},{user_coord[1]}"
            destination_coord_str = f"{destination_coord[0]},{destination_coord[1]}"
            
            try:
                route_points, total_text, total_sec = self.gmap_api.get_multiple_routes(
                    [(user_coord_str, station_coord), (station_coord, destination_coord_str)],
                    ['bicycling', 'walking']
                )

                candidates.append({
                    'station_uid': row['StationUID'],
                    'address': row['address'],
                    'lat': row['lat'],
                    'lng': row['lng'],
                    'total_time_text': total_text,
                    'total_time_sec': total_sec,
                    'route': route_points
                })
            except Exception as e:
                print(f"規劃路線失敗：{e}")
                continue

        # Step 4: 找出耗時最短的路徑
        if not candidates:
            return None

        best = min(candidates, key=lambda x: x['total_time_sec'])
        return best
