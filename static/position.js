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
    updateNavigationHint({ lat: parseFloat(userLat), lng: parseFloat(userLng) });

  }
  
  if (isLocked) {
    window.map.setView([userLat, userLng]);
  }

  // === 新增：根據用戶位置裁剪路線 ===
  if (window.updateTrimmedRoutes) {
    window.updateTrimmedRoutes(parseFloat(userLat), parseFloat(userLng));
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

// ====== 簡易版導航 ======
// 路線與導航最近點
let lastClosestIndex = -1;
let lastBCDistance = Infinity;

function updateNavigationHint(currentLatLng) {
  const route = window.currentRouteData?.bike_route || [];
  if (route.length < 2) return;

  let B, C;
  let recalculate = false;

  if (lastClosestIndex === -1) {
    // 第一次跑，初始化最近點
    recalculate = true;
  } else {
    B = route[lastClosestIndex];
    C = route[lastClosestIndex + 1];

    const distB = getDistance(currentLatLng, { lat: B[0], lng: B[1] });
    const distC = C ? getDistance(currentLatLng, { lat: C[0], lng: C[1] }) : Infinity;

    const avgDist = (distB + distC) / 2;

    // 如果移動太多或明顯偏離 B，再重新計算
    if (Math.abs(avgDist - lastBCDistance) > 5 || distB > lastBCDistance + 5) {
      recalculate = true;
    }
  }

  if (recalculate) {
    let minDist = Infinity;
    let closestIndex = -1;

    route.forEach((pt, idx) => {
      const d = getDistance(currentLatLng, { lat: pt[0], lng: pt[1] });
      if (d < minDist) {
        minDist = d;
        closestIndex = idx;
      }
    });

    lastClosestIndex = closestIndex;
    B = route[closestIndex];
    C = route[closestIndex + 1];

    const distB = getDistance(currentLatLng, { lat: B[0], lng: B[1] });
    const distC = C ? getDistance(currentLatLng, { lat: C[0], lng: C[1] }) : Infinity;
    lastBCDistance = (distB + distC) / 2;
  }

  if (!C) return;

  const A = [currentLatLng.lat, currentLatLng.lng];
  const angle = calculateAngle(A, B, C);
  const distToB = getDistance(currentLatLng, { lat: B[0], lng: B[1] });

  let directionText = '';
  if (-20 < angle < 20) {
    directionText = `直行 ${Math.round(distToB)} 公尺`;
  } else if (angle >= 20) {
    directionText = `往前 ${Math.round(distToB)} 公尺後右轉`;
  } else {
    directionText = `往前 ${Math.round(distToB)} 公尺後左轉`;
  }

  document.querySelector('.route-direction').textContent = directionText;

  // === 語音導航提示 ===
  const thresholds = [50, 25, 10];
  thresholds.forEach(threshold => {
    if (distToB === threshold){
      window.voiceNavigation.speak(directionText);
      console.log(`語音導航：${directionText}`);
    }
  });
}

// 計算距離與角度
function toRadians(deg) {
  return deg * Math.PI / 180;
}

function getDistance(p1, p2) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(p2.lat - p1.lat);
  const dLng = toRadians(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(p1.lat)) * Math.cos(toRadians(p2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateAngle(A, B, C) {
  // 向量 AB 和 BC
  const AB = [B[0] - A[0], B[1] - A[1]];
  const BC = [C[0] - B[0], C[1] - B[1]];

  // 點積與外積
  const dot = AB[0] * BC[0] + AB[1] * BC[1];
  const cross = AB[0] * BC[1] - AB[1] * BC[0]; // 2D 向量外積（純量）

  // 計算帶方向的角度
  const angleRad = Math.atan2(cross, dot); // 介於 -π 到 +π
  const angleDeg = angleRad * (180 / Math.PI); // 換成角度，介於 -180 到 180

  return angleDeg;
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