const map = L.map('map').setView([24.9913, 121.5645], 15);
//const map = L.map('map').setView([25.0335, 121.5645], 15);

let bikeLine, walkLine;
let userMarker, stationMarker, destMarker;
let infoBox;
let currentDestination = null;
let stationMarkers = [];  // 所有可還站的 marker

// 建立底圖
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 使用者輸入地址 → 後端 geocode → reroute
function geocodeAndRoute() {
  const address = document.getElementById('address').value;
  if (!address) {
    alert("請輸入地址");
    return;
  }

  fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
    .then(res => res.json())
    .then(data => {
      if (data.status !== 'ok') {
        alert("❌ 地址轉換失敗：" + data.message);
        return;
      }

      currentDestination = [data.lat, data.lng];
      map.setView(currentDestination, 14);
      reroute();

      if (destMarker) map.removeLayer(destMarker);
      destMarker = L.marker(currentDestination).addTo(map).bindPopup("🎯 目的地").openPopup();
    });
}

function reroute() {
  if (!navigator.geolocation || !currentDestination) return;

  navigator.geolocation.getCurrentPosition(position => {
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;
    const [destLat, destLng] = currentDestination;

    fetch(`/api/route?user_lat=${userLat}&user_lng=${userLng}&dest_lat=${destLat}&dest_lng=${destLng}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'fail') {
          alert(data.message);
          return;
        }

        const route = data.route;
        const station = data.station;
        const halfway = Math.floor(route.length / 2);

        // 移除舊圖層
        [bikeLine, walkLine, userMarker, stationMarker, infoBox].forEach(layer => {
          if (layer) map.removeLayer(layer);
        });

        bikeLine = L.polyline(route.slice(0, halfway), {
          color: 'blue', weight: 5
        }).addTo(map).bindPopup("🚴 騎乘路段");

        walkLine = L.polyline(route.slice(halfway), {
          color: 'green', weight: 4, dashArray: '5, 10'
        }).addTo(map).bindPopup("🚶 步行路段");

        userMarker = L.marker([userLat, userLng]).addTo(map).bindPopup("📍 你的位置");
        stationMarker = L.marker([station.lat, station.lng]).addTo(map).bindPopup("🚲 推薦還車站：" + station.address);

        infoBox = L.control();
        infoBox.onAdd = function () {
          const div = L.DomUtil.create('div', 'info');
          div.innerHTML = `<b>總時間：</b> ${data.total_time_text}`;
          div.style.backgroundColor = 'white';
          div.style.padding = '6px';
          div.style.border = '1px solid gray';
          return div;
        };
        infoBox.addTo(map);
      });
  }, error => {
    alert("⚠️ GPS 取得失敗：" + error.message);
  });
}

// 抓取並顯示所有可還車站
function showAllReturnStations() {
  clearStationMarkers();
  fetch('/api/available_stations')
    .then(res => res.json())
    .then(stations => {
      stations.forEach(st => {
        let fillColor = '#cccccc'; // 預設灰
        const avail = st.available;

        if (avail <= 2) {
          fillColor = '#d73027';  // 紅：快滿
        } else if (avail <= 5) {
          fillColor = '#fc8d59';  // 橘：中等
        } else {
          fillColor = '#91cf60';  // 綠：空位多
        }

        const marker = L.circleMarker([st.lat, st.lng], {
          radius: 6,
          color: '#666',
          fillColor: fillColor,
          fillOpacity: 0.7
        }).addTo(map).bindPopup(`🚲 ${st.address}<br>可還：${avail} 台`);
        stationMarkers.push(marker);
      });
    });
}

showAllReturnStations();  // 初始載入一次

const legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  const labels = [
    { color: '#d73027', label: '可還數量 ≦ 2（快滿）' },
    { color: '#fc8d59', label: '可還數量 3–5（中等）' },
    { color: '#91cf60', label: '可還數量 > 5（空位多）' }
  ];

  div.style.backgroundColor = 'white';
  div.style.padding = '8px';
  div.style.border = '1px solid gray';
  div.style.lineHeight = '1.4';
  div.style.fontSize = '13px';

  labels.forEach(item => {
    const box = `<i style="background:${item.color};width:12px;height:12px;display:inline-block;margin-right:6px;"></i>`;
    div.innerHTML += box + item.label + '<br>';
  });

  return div;
};

legend.addTo(map);

// 自動更新（每 60 秒 reroute）
setInterval(() => {
  if (currentDestination) reroute();
}, 59000);
