// stationInfo.js - 站點資訊管理模組

// 轉乘點 icon
const transferIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

// 站點管理相關變數
let stationMarkers = [];  // 所有可還站的 marker
let stationMarker = null;  // 當前轉乘站 marker
let stationUpdateInterval = null;
let allStationsUpdateInterval = null;
let stationLegend = null;  // 追蹤 Legend 實例
let isInitialized = false;  // 防止重複初始化

// 初始化站點資訊模組
function initializeStationInfo() {
  // 防止重複初始化
  if (isInitialized) {
    console.log('🏢 站點資訊模組已初始化，跳過重複初始化');
    return;
  }
  
  console.log('🏢 站點資訊模組初始化');
  
  // 建立圖例
  createStationLegend();
  
  // 初始載入所有站點
  showAllReturnStations();
  
  // 定時更新所有站點
  startAllStationsUpdate();
  
  // 標記為已初始化
  isInitialized = true;
}

// 建立圖例
function createStationLegend() {
  // 如果 Legend 已存在，先移除
  if (stationLegend) {
    window.map.removeControl(stationLegend);
    stationLegend = null;
  }

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

  stationLegend = legend;
  legend.addTo(window.map);
}

// 更新單一站點的剩餘車位資訊
function updateStationAvailability(stationUid) {
  if (!stationMarker || !stationUid) return;
  
  fetch(`/api/station_availability?uid=${stationUid}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        const currentPopup = stationMarker.getPopup();
        if (currentPopup) {
          const content = currentPopup.getContent();
          const updatedContent = content.replace(
            /<b>剩餘車位：<\/b>\d+ 個/,
            `<b>剩餘車位：</b>${data.available} 個`
          );
          stationMarker.setPopupContent(updatedContent);
        }
      }
    })
    .catch(error => {
      console.error('更新站點資訊失敗:', error);
    });
}

// 清除所有站點標記
function clearStationMarkers() {
  stationMarkers.forEach(marker => {
    window.map.removeLayer(marker);
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
        }).addTo(window.map).bindPopup(`🚲 ${st.address}<br>可還：${avail} 台`);
        
        stationMarkers.push(marker);
      });
      
      console.log('所有站點更新完成:', new Date().toLocaleTimeString());
    })
    .catch(error => {
      console.error('更新所有站點失敗:', error);
    });
}

// 創建轉乘站標記
function createTransferStationMarker(station) {
  // 移除舊的轉乘站標記
  if (stationMarker) {
    window.map.removeLayer(stationMarker);
  }
  
  // 創建新的轉乘站標記
  stationMarker = L.marker([station.lat, station.lng], { icon: transferIcon })
    .addTo(window.map)
    .bindPopup("🔁 <b>轉乘點</b>：還車後開始步行<br><b>📍 站名：</b>" + station.address + "<br><b>🅿️ 剩餘車位：</b>" + station.available + " 個");
  
  return stationMarker;
}

// 移除轉乘站標記
function removeTransferStationMarker() {
  if (stationMarker) {
    window.map.removeLayer(stationMarker);
    stationMarker = null;
  }
}

// 啟動轉乘站剩餘車位更新
function startStationUpdate(stationUid) {
  // 清除舊的定時器
  if (stationUpdateInterval) {
    clearInterval(stationUpdateInterval);
  }
  
  // 每60秒更新轉乘站剩餘車位
  stationUpdateInterval = setInterval(async () => {
    if (stationUid) {
      console.log('🔄 定時更新轉乘站剩餘車位');
      await updateStationAvailability(stationUid);
    }
  }, 60000);
}

// 停止轉乘站剩餘車位更新
function stopStationUpdate() {
  if (stationUpdateInterval) {
    clearInterval(stationUpdateInterval);
    stationUpdateInterval = null;
  }
}

// 啟動所有站點資訊更新
function startAllStationsUpdate() {
  // 清除舊的定時器
  if (allStationsUpdateInterval) {
    clearInterval(allStationsUpdateInterval);
  }
  
  // 每60秒更新所有站點資訊
  allStationsUpdateInterval = setInterval(async () => {
    console.log('🔄 定時更新所有站點');
    await showAllReturnStations();
  }, 60000);
}

// 停止所有站點資訊更新
function stopAllStationsUpdate() {
  if (allStationsUpdateInterval) {
    clearInterval(allStationsUpdateInterval);
    allStationsUpdateInterval = null;
  }
}

// 停止所有站點相關的定時器
function stopAllStationUpdates() {
  stopStationUpdate();
  stopAllStationsUpdate();
}

// 手動更新所有站點和轉乘站資訊
async function updateAllStationInfo() {
  try {
    // 更新所有站點
    await showAllReturnStations();
    
    // 如果有轉乘站，更新剩餘車位
    if (window.currentStationUid) {
      await updateStationAvailability(window.currentStationUid);
    }
    
    console.log('✅ 所有站點資訊更新完成');
  } catch (error) {
    console.error('❌ 站點資訊更新失敗:', error);
  }
}

// 重置模組狀態（用於測試或重新初始化）
function resetStationInfo() {
  console.log('🔄 重置站點資訊模組');
  
  // 停止所有定時器
  stopAllStationUpdates();
  
  // 清除所有標記
  clearStationMarkers();
  removeTransferStationMarker();
  
  // 移除 Legend
  if (stationLegend) {
    window.map.removeControl(stationLegend);
    stationLegend = null;
  }
  
  // 重置初始化狀態
  isInitialized = false;
}

// 將站點資訊模組掛載到全域
window.stationInfo = {
  // 初始化
  initialize: initializeStationInfo,
  reset: resetStationInfo,
  
  // 站點標記管理
  createTransferStationMarker,
  removeTransferStationMarker,
  clearStationMarkers,
  
  // 站點資訊更新
  updateStationAvailability,
  showAllReturnStations,
  updateAllStationInfo,
  
  // 定時器管理
  startStationUpdate,
  stopStationUpdate,
  startAllStationsUpdate,
  stopAllStationsUpdate,
  stopAllStationUpdates,
  
  // 取得站點標記
  getStationMarker: () => stationMarker,
  getStationMarkers: () => stationMarkers,
  
  // 轉乘點圖示
  transferIcon,
  
  // 狀態檢查
  isInitialized: () => isInitialized
};

// 頁面載入完成後自動初始化
document.addEventListener('DOMContentLoaded', function() {
  // 確保 map 已經初始化
  if (window.map) {
    initializeStationInfo();
  } else {
    // 如果 map 還沒初始化，等待一下
    setTimeout(() => {
      if (window.map) {
        initializeStationInfo();
      }
    }, 100);
  }
});

// 頁面卸載時清除所有定時器和資源
window.addEventListener('beforeunload', function() {
  resetStationInfo();
});

console.log('📦 站點資訊模組載入完成');