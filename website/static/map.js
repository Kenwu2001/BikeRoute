import { setupRouting, checkInstructionTrigger, setRoute } from './routing.js';

let userMarker;
let map;

export function initMap() {
  map = L.map('map').setView([25.033, 121.5654], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  userMarker = L.marker([0, 0]).addTo(map);
  setupRouting(map);
  return map;
}

export function startTracking() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(onPositionUpdate,
      err => console.error('定位錯誤：', err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
  } else {
    alert('此裝置不支援地理定位');
  }
}

function onPositionUpdate(pos) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const currentLatLng = L.latLng(lat, lng);
  userMarker.setLatLng(currentLatLng);
  map.setView(currentLatLng);
  checkInstructionTrigger(currentLatLng);
}

export function setupNavigationButton() {
  document.getElementById('start-nav').addEventListener('click', () => {
    const lat = parseFloat(document.getElementById('dest-lat').value);
    const lng = parseFloat(document.getElementById('dest-lng').value);
    if (isNaN(lat) || isNaN(lng)) {
      alert('請輸入有效的目的地緯度和經度');
      return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
      const start = L.latLng(pos.coords.latitude, pos.coords.longitude);
      const dest = L.latLng(lat, lng);
      setRoute(start, dest);
    });
  });
}
