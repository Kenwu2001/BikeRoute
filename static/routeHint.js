// routeHint.js - 路線提示相關功能

let routeHintBox; // 路线提示框

// 计算两点间距离（公里）
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 格式化距离显示
function formatDistance(km) {
  if (km < 1) {
    return Math.round(km * 1000) + 'm';
  } else {
    return km.toFixed(1) + 'km';
  }
}

// 获取当前路线状态和提示
function getCurrentRouteHint(userLat, userLng) {
  if (!currentRouteData) {
    return { 
      phase: 'waiting', 
      hint: '等待路線規劃...', 
      icon: '⏳',
      totalTime: '',
      lastUpdate: new Date().toLocaleTimeString()
    };
  }

  const station = currentRouteData.station;
  const destination = currentDestination;
  
  // 计算到转乘站的距离
  const distToStation = calculateDistance(userLat, userLng, station.lat, station.lng);
  // 计算到目的地的距离
  const distToDestination = calculateDistance(userLat, userLng, destination[0], destination[1]);
  
  // 判断当前阶段
  if (distToStation > 0.1) {  // 距离转乘站超过100米
    return {
      phase: 'biking',
      hint: `騎車前往轉乘站`,
      detail: `距離 ${formatDistance(distToStation)}`,
      icon: '🚴',
      station: station.address,
      totalTime: currentRouteData.total_time_text,
      lastUpdate: new Date().toLocaleTimeString()
    };
  } else if (distToDestination > 0.05) {  // 距离目的地超过50米
    return {
      phase: 'walking',
      hint: `步行前往目的地`,
      detail: `距離 ${formatDistance(distToDestination)}`,
      icon: '🚶',
      reminder: '記得還車！',
      totalTime: currentRouteData.total_time_text,
      lastUpdate: new Date().toLocaleTimeString()
    };
  } else {
    return {
      phase: 'arrived',
      hint: '已到達目的地',
      detail: '旅程完成',
      icon: '🎯',
      totalTime: currentRouteData.total_time_text,
      lastUpdate: new Date().toLocaleTimeString()
    };
  }
}

// 创建路线提示框
function createRouteHintBox() {
  if (routeHintBox) {
    map.removeControl(routeHintBox);
  }

  routeHintBox = L.control({ position: 'topright' });
  
  routeHintBox.onAdd = function() {
    const div = L.DomUtil.create('div', 'route-hint-box');
    div.innerHTML = `
      <div class="route-hint-content">
        <div class="route-icon">⏳</div>
        <div class="route-text">等待路線規劃...</div>
        <div class="route-info"></div>
      </div>
    `;
    
    // 样式设定
    div.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      border: 2px solid #007cba;
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-width: 200px;
      max-width: 320px;
    `;
    
    const content = div.querySelector('.route-hint-content');
    content.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    const mainContent = document.createElement('div');
    mainContent.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;
    
    const icon = div.querySelector('.route-icon');
    icon.style.cssText = `
      font-size: 24px;
      flex-shrink: 0;
    `;
    
    const text = div.querySelector('.route-text');
    text.style.cssText = `
      font-size: 14px;
      line-height: 1.4;
      font-weight: 500;
      color: #333;
    `;
    
    const info = div.querySelector('.route-info');
    info.style.cssText = `
      font-size: 12px;
      color: #666;
      border-top: 1px solid #eee;
      padding-top: 8px;
      margin-top: 4px;
    `;
    
    // 重新組織結構
    mainContent.appendChild(icon);
    mainContent.appendChild(text);
    content.insertBefore(mainContent, info);
    
    return div;
  };
  
  routeHintBox.addTo(map);
}

// 更新路线提示
function updateRouteHint(userLat, userLng) {
  if (!routeHintBox) return;
  
  const hint = getCurrentRouteHint(userLat, userLng);
  const hintDiv = document.querySelector('.route-hint-box');
  
  if (!hintDiv) return;
  
  const iconDiv = hintDiv.querySelector('.route-icon');
  const textDiv = hintDiv.querySelector('.route-text');
  const infoDiv = hintDiv.querySelector('.route-info');
  
  iconDiv.textContent = hint.icon;
  
  let hintText = `<strong>${hint.hint}</strong>`;
  if (hint.detail) {
    hintText += `<br><span style="font-size: 12px; color: #666;">${hint.detail}</span>`;
  }
  if (hint.station) {
    hintText += `<br><span style="font-size: 12px; color: #007cba;">目標: ${hint.station}</span>`;
  }
  if (hint.reminder) {
    hintText += `<br><span style="font-size: 12px; color: #e74c3c;">⚠️ ${hint.reminder}</span>`;
  }
  
  textDiv.innerHTML = hintText;
  
  // 更新資訊區域
  let infoText = '';
  if (hint.totalTime) {
    infoText += `<strong>總時間：</strong>${hint.totalTime}<br>`;
  }
  infoText += `<strong>最後更新：</strong>${hint.lastUpdate}`;
  infoDiv.innerHTML = infoText;
  
  // 根据阶段调整边框颜色
  const colors = {
    waiting: '#6c757d',
    biking: '#007cba', 
    walking: '#28a745',
    arrived: '#17a2b8'
  };
  
  hintDiv.style.borderColor = colors[hint.phase] || '#007cba';
}

// 更新路線提示框顯示錯誤
function updateRouteHintWithError(errorMessage) {
  if (routeHintBox) {
    const hintDiv = document.querySelector('.route-hint-box');
    if (hintDiv) {
      const iconDiv = hintDiv.querySelector('.route-icon');
      const textDiv = hintDiv.querySelector('.route-text');
      const infoDiv = hintDiv.querySelector('.route-info');
      
      iconDiv.textContent = '❌';
      textDiv.innerHTML = `<strong>${errorMessage}</strong>`;
      infoDiv.innerHTML = `<strong>時間：</strong>${new Date().toLocaleTimeString()}`;
      
      hintDiv.style.borderColor = '#dc3545';
      hintDiv.style.backgroundColor = 'rgba(248, 215, 218, 0.95)';
    }
  }
}