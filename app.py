from flask import Flask, render_template, request, jsonify
import requests
import os
from services.routing import RoutingService

if os.getenv('ENV') == 'PROD':
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
else:
    from env.config import GOOGLE_API_KEY

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('map.html')  # 顯示地圖

@app.route('/api/route')
def get_route():
    user_lat = request.args.get('user_lat', type=float)
    user_lng = request.args.get('user_lng', type=float)
    dest_lat = request.args.get('dest_lat', type=float)
    dest_lng = request.args.get('dest_lng', type=float)
    group_size = request.args.get('group_size', default=1, type=int)

    routing_service = RoutingService()
    result = routing_service.find_best_return_station(
        user_coord=(user_lat, user_lng),
        destination_coord=(dest_lat, dest_lng),
        group_size=group_size
    )

    if result is None:
        return jsonify({'status': 'fail', 'message': '找不到可用路線'}), 400

    return jsonify({
        'status': 'ok',
        'station': {
            'uid': result['station_uid'],
            'address': result['address'],
            'lat': result['lat'],
            'lng': result['lng']
        },
        'bike_route': result['bike_route'],
        'walk_route': result['walk_route'],
        'total_time_text': result['total_time_text'],
        'total_time_sec': result['total_time_sec']
    })

@app.route('/api/geocode')
def geocode_address():
    address = request.args.get('address')
    if not address:
        return jsonify({'status': 'fail', 'message': '地址為必填欄位'}), 400

    url = f"https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={GOOGLE_API_KEY}"
    res = requests.get(url)
    data = res.json()

    if data['status'] != 'OK':
        return jsonify({'status': 'fail', 'message': f"無法轉換地址: {data['status']}"}), 400

    location = data['results'][0]['geometry']['location']
    return jsonify({
        'status': 'ok',
        'lat': location['lat'],
        'lng': location['lng']
    })

@app.route('/api/available_stations')
def available_stations():
    from services.tdx import TDXBikeAPI
    bike_api = TDXBikeAPI()
    df = bike_api.get_available_return_stations()

    stations = []
    for _, row in df.iterrows():
        stations.append({
            'uid': row['StationUID'],
            'lat': row['lat'],
            'lng': row['lng'],
            'address': row['address'],
            'available': row['AvailableReturnBikes']
        })

    return jsonify(stations)

@app.route('/api/station_availability')
def get_station_availability():
    station_uid = request.args.get('uid')
    if not station_uid:
        return jsonify({'status': 'fail', 'message': '站點UID為必填欄位'}), 400

    try:
        from services.tdx import TDXBikeAPI
        bike_api = TDXBikeAPI()
        station_info = bike_api.get_station_info_by_uid(station_uid)
        
        if station_info is None:
            return jsonify({'status': 'fail', 'message': '找不到指定站點'}), 404

        return jsonify({
            'status': 'ok',
            'uid': station_uid,
            'available': station_info['AvailableReturnBikes']
        })
    except Exception as e:
        return jsonify({'status': 'fail', 'message': f'取得站點資訊失敗: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True)