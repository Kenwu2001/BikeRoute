from flask import Flask, render_template, request, jsonify
import requests
import os # for deployment environment
# from env.config import GOOGLE_API_KEY  # for local development
from services.routing import RoutingService

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

    routing_service = RoutingService()
    result = routing_service.find_best_return_station(
        user_coord=(user_lat, user_lng),
        destination_coord=(dest_lat, dest_lng)
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
        'route': result['route'],
        'total_time_text': result['total_time_text'],
        'total_time_sec': result['total_time_sec']
    })

@app.route('/api/geocode')
def geocode_address():
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
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
            'available': int(row['AvailableReturnBikes'])
        })

    return jsonify(stations)


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
