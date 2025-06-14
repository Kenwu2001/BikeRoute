// 轉乘點 icon
const transferIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

const map = L.map('map').setView([24.995430, 121.569280], 15);
//const map = L.map('map').setView([25.0335, 121.5645], 15);

let bikeLine, walkLine;
let userMarker, stationMarker, destMarker;
let infoBox;
let currentDestination = null;
let stationMarkers = [];  // 所有可還站的 marker
let isLocked = false;

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
    const groupSize = document.getElementById('group').value;

    fetch(`/api/route?user_lat=${userLat}&user_lng=${userLng}&dest_lat=${destLat}&dest_lng=${destLng}&group_size=${groupSize}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'fail') {
          alert(data.message);
          return;
        }

        const bikeRoute = data.bike_route;
        const walkRoute = data.walk_route;
        const station = data.station;

        // 移除舊圖層
        [bikeLine, walkLine, userMarker, stationMarker, infoBox].forEach(layer => {
          if (layer) map.removeLayer(layer);
        });

        bikeLine = L.polyline(bikeRoute, {
          color: 'blue', weight: 5
        }).addTo(map).bindPopup("🚴 騎乘路段");

        walkLine = L.polyline(walkRoute, {
          color: 'green', weight: 4, dashArray: '5, 10'
        }).addTo(map).bindPopup("🚶 步行路段");

        userMarker = L.marker([userLat, userLng]).addTo(map).bindPopup("📍 你的位置");
        stationMarker = L.marker([station.lat, station.lng], { icon: transferIcon })
          .addTo(map)
          .bindPopup("🔁 轉乘點：還車後開始步行<br><b>站名：</b>" + station.address);

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

function clearStationMarkers() {
  stationMarkers.forEach(marker => {
    map.removeLayer(marker);
  });
  stationMarkers = [];
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

let userLocationControl = L.control({ position: 'bottomleft' });

userLocationControl.onAdd = function () {
  const div = L.DomUtil.create('div', 'info user-location');
  div.innerHTML = "📍 等待定位中...";
  div.style.backgroundColor = 'white';
  div.style.padding = '6px';
  div.style.border = '1px solid gray';
  div.style.fontSize = '13px';
  div.style.lineHeight = '1.2';
  return div;
};

userLocationControl.addTo(map);

if (navigator.geolocation) {
  navigator.geolocation.watchPosition(onPositionUpdate, onPositionError, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 10000
  });
} else {
  alert("⚠️ 無法取得裝置定位功能");
}

function onPositionUpdate(position) {
  const userLat = position.coords.latitude.toFixed(6);
  const userLng = position.coords.longitude.toFixed(6);

  // 顯示在右下角座標欄位
  const div = document.querySelector('.user-location');
  div.innerHTML = `📍 目前位置：<br>Lat: ${userLat}<br>Lng: ${userLng}`;

  // 如果有 marker，就更新其位置；沒有就新建
  if (userMarker) {
    userMarker.setLatLng([userLat, userLng]);
  } else {
    userMarker = L.marker([userLat, userLng]).addTo(map).bindPopup("📍 你的位置");
  }

  if (isLocked) {
    map.setView([userLat, userLng]);
  }

}

function onPositionError(error) {
  const div = document.querySelector('.user-location');
  div.innerHTML = `⚠️ 定位失敗：${error.message}`;
}

function toggleLock() {
  isLocked = !isLocked;
  const btn = document.getElementById('lock-btn');
  btn.textContent = isLocked ? '🔒 鎖定中' : '🔓 鎖定我';
}

// 自動更新（每 59 秒 reroute）
setInterval(() => {
  if (currentDestination) reroute();
}, 59000);
