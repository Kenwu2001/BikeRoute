// main.js - 主要地圖和路線規劃功能（已移除位置和站點相關代碼）

const map = L.map('map').setView([24.995430, 121.569280], 15);

let bikeLine, walkLine;
let destMarker;
let currentDestination = null;
let previousDestination = null;  // 新增：記錄上一次的目的地
let rerouteInterval;
let currentRouteData = null;  // 保存当前路线数据

// 將 map 設為全域變數供其他模組使用
window.map = map;
window.currentDestination = null;
window.currentRouteData = null;

// 建立底圖
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 比較兩個座標是否相同（允許小數點誤差）
function isSameDestination(dest1, dest2) {
  if (!dest1 || !dest2) return false;
  const tolerance = 0.0001; // 約10公尺的誤差範圍
  return Math.abs(dest1[0] - dest2[0]) < tolerance && 
         Math.abs(dest1[1] - dest2[1]) < tolerance;
}

// 使用者輸入地址 → 後端 geocode → reroute
async function geocodeAndRoute() {
  const address = document.getElementById('address')?.value;
  if (!address) {
    alert("請輸入地址");
    // === 新增：語音提示 ===
    if (window.voiceNavigation && window.voiceNavigation.isEnabled) {
      window.voiceNavigation.speak("請輸入地址");
    }
    return;
  }

  console.log('🔍 開始地址解析:', address);

  try {
    const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    const data = await response.json();
    
    if (data.status !== 'ok') {
      alert("❌ 地址轉換失敗：" + data.message);
      // === 新增：語音播報錯誤 ===
      if (window.voiceNavigation) {
        window.voiceNavigation.announceEmergency("地址轉換失敗");
      }
      return;
    }

    // 記錄舊的目的地
    previousDestination = currentDestination;
    currentDestination = [data.lat, data.lng];
    window.currentDestination = currentDestination;
    console.log('📍 目的地設定為:', currentDestination);
    
    map.setView(currentDestination, 16);

    if (destMarker) map.removeLayer(destMarker);
    destMarker = L.marker(currentDestination).addTo(map).bindPopup("🎯 目的地").openPopup();
    
    // === 修改：只有在目的地改變時才播報 ===
    if (window.voiceNavigation && window.voiceNavigation.isEnabled) {
      if (!isSameDestination(previousDestination, currentDestination)) {
        window.voiceNavigation.speak("目的地設定完成，開始規劃路線");
      }
    }
    
    // 创建路线提示框
    createRouteHintBox();
    
    // 立即執行路線規劃
    await reroute();
    
    // 啟動定時器
    startIntervals();
    
  } catch (error) {
    console.error('地址解析失敗:', error);
    alert("❌ 地址解析失敗：" + error.message);
    // === 新增：語音播報錯誤 ===
    if (window.voiceNavigation) {
      window.voiceNavigation.announceEmergency("地址解析失敗");
    }
  }
}

// 啟動定時器
function startIntervals() {
  // 清除舊的定時器
  clearAllIntervals();
  
  console.log('⏰ 啟動定時器');
  
  // 每60秒重新規劃路線
  rerouteInterval = setInterval(async () => {
    if (currentDestination) {
      console.log('🔄 定時重新規劃路線');
      await reroute();
    }
  }, 60000);
  
  // 啟動站點資訊更新定時器
  if (window.stationInfo) {
    window.stationInfo.startAllStationsUpdate();
  }
}

// 清除所有定時器
function clearAllIntervals() {
  if (rerouteInterval) {
    clearInterval(rerouteInterval);
    rerouteInterval = null;
  }
  
  // 清除站點相關定時器
  if (window.stationInfo) {
    window.stationInfo.stopAllStationUpdates();
  }
}

async function reroute() {
  if (!navigator.geolocation || !currentDestination) {
    console.log('❌ reroute 條件不滿足: geolocation或currentDestination缺失');
    return;
  }

  console.log('🔄 開始重新規劃路線...', new Date().toLocaleTimeString());

  try {
    // 使用 position 模組的定位函數
    const position = await window.positionModule.getCurrentLocationWithRetry(3);
    
    // 保存位置快取
    window.lastKnownPosition = position;

    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;
    const [destLat, destLng] = currentDestination;
    const groupSize = document.getElementById('group')?.value || 1;

    console.log(`📍 取得位置: ${userLat}, ${userLng}`);
    console.log(`🎯 目的地: ${destLat}, ${destLng}`);

    const response = await fetch(`/api/route?user_lat=${userLat}&user_lng=${userLng}&dest_lat=${destLat}&dest_lng=${destLng}&group_size=${groupSize}`);
    const data = await response.json();

    if (data.status === 'fail') {
      console.error('❌ 路線規劃失敗:', data.message);
      alert(data.message);
      
      // 語音播報錯誤
      if (window.voiceNavigation) {
        window.voiceNavigation.announceEmergency('路線規劃失敗');
      }
      return;
    }

    console.log('✅ 路線規劃成功');

    // 保存路线数据
    currentRouteData = data;
    window.currentRouteData = data;
    
    const bikeRoute = data.bike_route;
    const walkRoute = data.walk_route;
    const station = data.station;
    
    // 保存當前轉乘站 UID
    window.currentStationUid = station.uid;

    // 移除舊路線圖層
    [bikeLine, walkLine].forEach(layer => {
      if (layer) {
        try {
          map.removeLayer(layer);
        } catch (e) {
          console.warn('移除圖層時發生錯誤:', e);
        }
      }
    });

    // 立即更新地圖路線
    bikeLine = L.polyline(bikeRoute, {
      color: 'blue', weight: 5
    }).addTo(map).bindPopup("🚴 騎乘路段");

    walkLine = L.polyline(walkRoute, {
      color: 'green', weight: 4, dashArray: '5, 10'
    }).addTo(map).bindPopup("🚶 步行路段");

    // 使用站點資訊模組創建轉乘站標記
    if (window.stationInfo) {
      window.stationInfo.createTransferStationMarker(station);
      // 啟動轉乘站剩餘車位更新
      window.stationInfo.startStationUpdate(station.uid);
      // 立即更新轉乘站剩餘車位
      window.stationInfo.updateStationAvailability(station.uid);
    }

    // 更新路线提示
    updateRouteHint(userLat, userLng);

    // === 修改：只有在目的地改變時才播報路線概覽 ===
    if (window.voiceNavigation && window.voiceNavigation.isEnabled) {
      // 分析路線（這個總是要做，因為可能有路線變化）
      window.voiceNavigation.analyzeRoute(data);
      
      // 只有在目的地改變時才播報路線概覽
      if (!isSameDestination(previousDestination, currentDestination)) {
        // 延遲一點播報，讓其他操作先完成
        setTimeout(() => {
          window.voiceNavigation.announceRouteOverview(data);
        }, 1500);
      } else {
        console.log('🔇 目的地相同，跳過路線概覽播報');
      }
    }

    // 強制重繪地圖
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    console.log('🎉 路線更新完成:', new Date().toLocaleTimeString());

  } catch (error) {
    console.error('❌ reroute 執行失敗:', error);
    
    // 根據錯誤類型給出不同的提示
    let errorMessage = "路線規劃失敗";
    if (error.code === 3) {
      errorMessage = "GPS 定位超時，請確認位置服務已開啟";
    } else if (error.code === 1) {
      errorMessage = "GPS 定位被拒絕，請允許網站使用位置服務";
    } else if (error.code === 2) {
      errorMessage = "GPS 定位不可用";
    }
    
    // 顯示錯誤在路線提示框中
    updateRouteHintWithError(errorMessage);
    
    // === 新增：語音播報錯誤 ===
    if (window.voiceNavigation) {
      window.voiceNavigation.announceEmergency(errorMessage);
    }
    
  } finally {
    hideLoadingState();
  }
}

// 隱藏載入狀態
function hideLoadingState() {
  // 載入狀態會在 reroute 完成後自動被新的路線提示取代
}

// 按鈕點擊監聽器 - 任何按鈕點擊都觸發更新（排除特定按鈕）
function setupButtonListeners() {
  // 監聽所有按鈕的點擊事件
  document.addEventListener('click', async function(event) {
    // 排除特定按鈕
    const excludedButtons = ['toggleLock', 'lock-toggleVoiceNavigation', 'speakCurrentStatus']; // 可以添加更多需要排除的按鈕ID
    const excludedClasses = ['no-reroute']; // 可以通過class排除
    
    // 檢查是否點擊的是按鈕
    if (event.target.tagName === 'BUTTON' || event.target.type === 'button' || 
        event.target.classList.contains('btn') || event.target.id.includes('btn')) {
      
      console.log('🖱️ 按鈕點擊觸發更新:', event.target.id || event.target.textContent, new Date().toLocaleTimeString());
      
      // 稍微延遲執行更新，讓按鈕的原始功能先執行
      setTimeout(async () => {
        try {
          // 首先嘗試獲取當前位置並更新位置資訊
          if (navigator.geolocation && window.positionModule) {
            try {
              const position = await window.positionModule.getCurrentLocationWithRetry(1); // 使用較短的重試次數
              console.log('🖱️ 按鈕觸發位置更新');
              window.positionModule.onPositionUpdate(position);
            } catch (error) {
              console.warn('⚠️ 按鈕觸發位置更新失敗:', error.message);
              // 位置更新失敗不阻止其他更新
            }
          }
          
          // 更新所有站點資訊
          if (window.stationInfo) {
            await window.stationInfo.updateAllStationInfo();
          }
          
          // 如果有目的地，重新規劃路線
          if (currentDestination) {
            // 檢查是否是被排除的按鈕
            if (excludedButtons.includes(event.target.id) || 
                excludedClasses.some(cls => event.target.classList.contains(cls))) {
              console.log('🚫 跳過排除的按鈕:', event.target.id || event.target.textContent);
            }
            else{
              await reroute();
            }
          }
          
          console.log('✅ 按鈕觸發的更新完成');
        } catch (error) {
          console.error('❌ 按鈕觸發更新失敗:', error);
        }
      }, 100); // 延遲100毫秒
    }
  });
}

// 初始化應用程式
function initializeApp() {
  console.log('🚀 初始化主應用程式');
  
  // 初始化位置追蹤
  if (window.positionModule) {
    window.positionModule.initializeUserLocationTracking();
  }
  
  // 初始化站點資訊模組
  if (window.stationInfo) {
    window.stationInfo.initialize();
  }
  
  // === 新增：初始化語音導航模組 ===
  if (window.voiceNavigation) {
    console.log('🎤 語音導航模組已就緒');
  } else {
    console.warn('⚠️ 語音導航模組未載入');
  }
  
  // 設置按鈕監聽器
  setupButtonListeners();
  
  console.log('✅ 主應用程式初始化完成');
}

// 在頁面載入完成後初始化應用程式
document.addEventListener('DOMContentLoaded', function() {
  // 稍微延遲初始化，確保所有模組都已載入
  setTimeout(initializeApp, 100);
});

// 如果頁面已經載入完成，立即初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeApp, 100);
  });
} else {
  setTimeout(initializeApp, 100);
}

// 頁面卸載時清除所有定時器
window.addEventListener('beforeunload', function() {
  clearAllIntervals();
});

// 切換語音導航
function toggleVoiceNavigation() {
  if (window.voiceNavigation) {
    const isEnabled = window.voiceNavigation.toggleVoiceNavigation();
    console.log('🎤 語音導航狀態:', isEnabled ? '啟用' : '停用');
    return isEnabled;
  }
  return false;
}

// 播報當前狀態
function speakCurrentStatus() {
  if (window.voiceNavigation) {
    window.voiceNavigation.announceCurrentStatus();
  }
}

// 暴露全域函數供 HTML 使用
window.toggleVoiceNavigation = toggleVoiceNavigation;
window.speakCurrentStatus = speakCurrentStatus;
window.geocodeAndRoute = geocodeAndRoute;
window.reroute = reroute;

console.log('📦 主模組載入完成');