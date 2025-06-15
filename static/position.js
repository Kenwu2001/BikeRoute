// position.js - 位置相關功能
let userMarker;
let isLocked = false;

// 改善的定位函數，包含重試機制
async function getCurrentLocationWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📍 定位嘗試 ${attempt}/${maxRetries}`);
      
      const position = await new Promise((resolve, reject) => {
        const options = {
          enableHighAccuracy: attempt === 1, // 第一次嘗試高精度，後續降低要求
          timeout: attempt === 1 ? 10000 : 15000, // 逐步增加超時時間
          maximumAge: attempt === 1 ? 60000 : 300000 // 後續嘗試接受更舊的快取
        };
        
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
      
      console.log(`✅ 定位成功 (嘗試 ${attempt}): ${position.coords.latitude}, ${position.coords.longitude}`);
      return position;
      
    } catch (error) {
      console.warn(`⚠️ 定位嘗試 ${attempt} 失敗:`, error.message);
      
      if (attempt === maxRetries) {
        // 最後嘗試失敗，檢查是否有之前的位置快取
        if (window.lastKnownPosition) {
          console.log('📍 使用上次已知位置');
          return window.lastKnownPosition;
        }
        throw error;
      }
      
      // 等待一段時間後重試
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// 初始化用戶位置監控
function initializeUserLocationTracking() {
  // 創建用戶位置控制項（但不顯示等待中的文字）
  let userLocationControl = L.control({ position: 'bottomleft' });
  userLocationControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'info user-location');
    div.innerHTML = ""; // 初始為空，等定位成功後再顯示
    div.style.backgroundColor = 'white';
    div.style.padding = '6px';
    div.style.border = '1px solid gray';
    div.style.fontSize = '13px';
    div.style.lineHeight = '1.2';
    div.style.display = 'none'; // 初始隱藏
    return div;
  };
  userLocationControl.addTo(window.map);
  
  // 開始監控用戶位置
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(onPositionUpdate, onPositionError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    });
  } else {
    alert("⚠️ 無法取得裝載定位功能");
  }
}

// 位置更新回調函數
function onPositionUpdate(position) {
  const userLat = position.coords.latitude.toFixed(6);
  const userLng = position.coords.longitude.toFixed(6);
  
  // 顯示在右下角座標欄位
  const div = document.querySelector('.user-location');
  if (div) {
    div.innerHTML = `📍 目前位置：<br>Lat: ${userLat}<br>Lng: ${userLng}`;
    div.style.display = 'block'; // 定位成功後顯示
  }
  
  // 如果有 marker，就更新其位置；沒有就新建
  if (userMarker) {
    userMarker.setLatLng([userLat, userLng]);
  } else {
    userMarker = L.marker([userLat, userLng]).addTo(window.map).bindPopup("📍 你的位置");
  }
  
  // 更新路线提示
  if (window.currentDestination && window.currentRouteData) {
    updateRouteHint(parseFloat(userLat), parseFloat(userLng));
  }
  
  if (isLocked) {
    window.map.setView([userLat, userLng]);
  }
}

// 位置錯誤回調函數
function onPositionError(error) {
  const div = document.querySelector('.user-location');
  if (div) {
    div.innerHTML = `⚠️ 定位失敗：${error.message}`;
    div.style.display = 'block'; // 錯誤時也顯示
  }
}

// 切換位置鎖定狀態
function toggleLock() {
  isLocked = !isLocked;
  const btn = document.getElementById('lock-btn');
  if (btn) {
    btn.textContent = isLocked ? '🔒 鎖定中' : '🔓 鎖定我';
  }
}

// 獲取當前用戶位置（一次性）
async function getCurrentUserLocation() {
  if (userMarker) {
    const latLng = userMarker.getLatLng();
    return {
      coords: {
        latitude: latLng.lat,
        longitude: latLng.lng
      }
    };
  }
  
  return await getCurrentLocationWithRetry(3);
}

// 清除用戶位置標記
function clearUserMarker() {
  if (userMarker) {
    window.map.removeLayer(userMarker);
    userMarker = null;
  }
}

// 導出函數供其他模組使用
window.positionModule = {
  getCurrentLocationWithRetry,
  initializeUserLocationTracking,
  toggleLock,
  getCurrentUserLocation,
  clearUserMarker,
  onPositionUpdate,
  onPositionError
};