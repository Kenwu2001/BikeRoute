// speak.js - 語音導航模組

class VoiceNavigation {
  constructor() {
    this.isEnabled = false;
    this.currentInstructionIndex = 0;
    this.instructions = [];
    this.lastSpokenDistance = null;
    this.speechSynthesis = window.speechSynthesis;
    this.currentVoice = null;
    this.lastPosition = null;
    this.routeSegments = [];
    
    this.initializeVoice();
  }

  // 初始化語音設定
  initializeVoice() {
    // 等待語音列表載入
    if (this.speechSynthesis.getVoices().length === 0) {
      this.speechSynthesis.addEventListener('voiceschanged', () => {
        this.setupVoice();
      });
    } else {
      this.setupVoice();
    }
  }

  setupVoice() {
    const voices = this.speechSynthesis.getVoices();
    // 優先選擇中文語音
    this.currentVoice = voices.find(voice => 
      voice.lang.includes('zh') || voice.lang.includes('cmn')
    ) || voices[0];
    
    console.log('🎤 語音設定完成:', this.currentVoice?.name || '預設語音');
  }

  // 語音播報
  speak(text, priority = 'normal') {
    if (!this.isEnabled) return;
    
    // 高優先級訊息會中斷當前播報
    if (priority === 'high') {
      this.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.currentVoice) {
      utterance.voice = this.currentVoice;
    }
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    console.log('🎤 語音播報:', text);
    this.speechSynthesis.speak(utterance);
  }

  // 啟用/停用語音導航
  toggleVoiceNavigation() {
    this.isEnabled = !this.isEnabled;
    
    if (this.isEnabled) {
      this.speak('語音導航已啟用', 'high');
      // 如果有當前路線，立即播報概況
      if (window.currentRouteData) {
        setTimeout(() => {
          this.announceRouteOverview(window.currentRouteData);
        }, 2000);
      }
    } else {
      this.speechSynthesis.cancel();
      console.log('🔇 語音導航已停用');
    }
    
    return this.isEnabled;
  }

  // 分析路線並生成導航指令
  analyzeRoute(routeData) {
    if (!routeData) return;
    
    this.routeSegments = [];
    this.instructions = [];
    
    const { bike_route, walk_route, station } = routeData;
    
    // 第一段：騎乘到轉乘站
    if (bike_route && bike_route.length > 1) {
      const bikeSegment = this.analyzeBikeRoute(bike_route, station);
      this.routeSegments.push(bikeSegment);
    }
    
    // 第二段：從轉乘站步行到目的地
    if (walk_route && walk_route.length > 1) {
      const walkSegment = this.analyzeWalkRoute(walk_route, station);
      this.routeSegments.push(walkSegment);
    }
    
    this.currentInstructionIndex = 0;
    console.log('🗺️ 路線分析完成，共', this.routeSegments.length, '個段落');
  }

  // 分析騎乘路線
  analyzeBikeRoute(route, station) {
    const instructions = [];
    const totalDistance = this.calculateRouteDistance(route);
    
    // 起點指令
    instructions.push({
      type: 'start',
      text: `開始騎乘共享單車，前往${station.name}站`,
      position: route[0],
      distance: 0
    });
    
    // 分析轉彎點
    const turns = this.detectTurns(route);
    turns.forEach(turn => {
      instructions.push({
        type: 'turn',
        text: this.getTurnInstruction(turn.direction),
        position: turn.position,
        distance: turn.distance
      });
    });
    
    // 到達轉乘站
    instructions.push({
      type: 'arrive_station',
      text: `到達${station.name}站，請歸還單車`,
      position: route[route.length - 1],
      distance: totalDistance
    });
    
    return {
      type: 'bike',
      instructions,
      totalDistance,
      route
    };
  }

  // 分析步行路線
  analyzeWalkRoute(route, station) {
    const instructions = [];
    const totalDistance = this.calculateRouteDistance(route);
    
    // 起點指令
    instructions.push({
      type: 'start_walk',
      text: `從${station.name}站開始步行前往目的地`,
      position: route[0],
      distance: 0
    });
    
    // 分析轉彎點
    const turns = this.detectTurns(route);
    turns.forEach(turn => {
      instructions.push({
        type: 'turn',
        text: this.getTurnInstruction(turn.direction),
        position: turn.position,
        distance: turn.distance
      });
    });
    
    // 到達目的地
    instructions.push({
      type: 'arrive_destination',
      text: '到達目的地',
      position: route[route.length - 1],
      distance: totalDistance
    });
    
    return {
      type: 'walk',
      instructions,
      totalDistance,
      route
    };
  }

  // 偵測轉彎點
  detectTurns(route) {
    const turns = [];
    if (route.length < 3) return turns;
    
    for (let i = 1; i < route.length - 1; i++) {
      const prev = route[i - 1];
      const curr = route[i];
      const next = route[i + 1];
      
      const angle = this.calculateAngle(prev, curr, next);
      
      // 如果角度變化超過30度，認為是轉彎
      if (Math.abs(angle) > 30) {
        const distance = this.calculateDistance(route[0], curr);
        turns.push({
          position: curr,
          direction: angle > 0 ? 'left' : 'right',
          angle,
          distance
        });
      }
    }
    
    return turns;
  }

  // 計算角度
  calculateAngle(p1, p2, p3) {
    const bearing1 = this.calculateBearing(p2, p1);
    const bearing2 = this.calculateBearing(p2, p3);
    let angle = bearing2 - bearing1;
    
    // 標準化角度到-180到180度之間
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    
    return angle;
  }

  // 計算方位角
  calculateBearing(p1, p2) {
    const lat1 = p1[0] * Math.PI / 180;
    const lat2 = p2[0] * Math.PI / 180;
    const deltaLng = (p2[1] - p1[1]) * Math.PI / 180;
    
    const x = Math.sin(deltaLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
    
    return Math.atan2(x, y) * 180 / Math.PI;
  }

  // 生成轉彎指令
  getTurnInstruction(direction) {
    const instructions = {
      left: ['向左轉', '左轉', '往左'],
      right: ['向右轉', '右轉', '往右']
    };
    
    const options = instructions[direction] || ['繼續前進'];
    return options[Math.floor(Math.random() * options.length)];
  }

  // 計算路線總距離
  calculateRouteDistance(route) {
    let totalDistance = 0;
    for (let i = 1; i < route.length; i++) {
      totalDistance += this.calculateDistance(route[i - 1], route[i]);
    }
    return totalDistance;
  }

  // 計算兩點間距離（公尺）
  calculateDistance(point1, point2) {
    const R = 6371000; // 地球半徑（公尺）
    const lat1 = point1[0] * Math.PI / 180;
    const lat2 = point2[0] * Math.PI / 180;
    const deltaLat = (point2[0] - point1[0]) * Math.PI / 180;
    const deltaLng = (point2[1] - point1[1]) * Math.PI / 180;
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  // 播報路線概況
  announceRouteOverview(routeData) {
    if (!this.isEnabled) return;
    
    this.analyzeRoute(routeData);
    
    const { station } = routeData;
    const bikeSegment = this.routeSegments.find(s => s.type === 'bike');
    const walkSegment = this.routeSegments.find(s => s.type === 'walk');
    
    let overview = '路線規劃完成。';
    
    if (bikeSegment) {
      const bikeDistance = Math.round(bikeSegment.totalDistance);
      overview += `首先騎乘共享單車${bikeDistance}公尺到達共享單車站。`;
    }
    
    if (walkSegment) {
      const walkDistance = Math.round(walkSegment.totalDistance);
      overview += `然後步行${walkDistance}公尺到達目的地。`;
    }
    
    this.speak(overview, 'high');
  }

  // 播報路線更新概況
  announceRouteUpdate(routeData, reason = '') {
    if (!this.isEnabled) return;
    
    this.analyzeRoute(routeData);
    
    const { station } = routeData;
    const bikeSegment = this.routeSegments.find(s => s.type === 'bike');
    const walkSegment = this.routeSegments.find(s => s.type === 'walk');
    
    let overview = '路線已重新規劃。';
    
    // 如果有提供重新規劃的原因，加入說明
    if (reason) {
      overview += `${reason}。`;
    }
    
    if (bikeSegment) {
      const bikeDistance = Math.round(bikeSegment.totalDistance);
      overview += `新路線：先騎乘共享單車${bikeDistance}公尺到達共享單車站。`;
    }
    
    if (walkSegment) {
      const walkDistance = Math.round(walkSegment.totalDistance);
      overview += `接著步行${walkDistance}公尺到達目的地。`;
    }
    
    this.speak(overview, 'high');
  }

  // 根據當前位置提供導航指引
  updateNavigation(currentPosition) {
    if (!this.isEnabled || !currentPosition || this.routeSegments.length === 0) return;
    
    this.lastPosition = currentPosition;
    const userLat = currentPosition.coords.latitude;
    const userLng = currentPosition.coords.longitude;
    const userPoint = [userLat, userLng];
    
    // 找到當前應該執行的段落
    const currentSegment = this.getCurrentSegment(userPoint);
    if (!currentSegment) return;
    
    // 找到最近的指令
    const nextInstruction = this.getNextInstruction(userPoint, currentSegment);
    if (!nextInstruction) return;
    
    const distance = this.calculateDistance(userPoint, nextInstruction.position);
    
    // 距離播報邏輯
    this.handleDistanceAnnouncement(nextInstruction, distance);
  }

  // 取得當前段落
  getCurrentSegment(userPoint) {
    // 簡化邏輯：根據距離判斷當前在哪個段落
    for (const segment of this.routeSegments) {
      const distanceToStart = this.calculateDistance(userPoint, segment.route[0]);
      const distanceToEnd = this.calculateDistance(userPoint, segment.route[segment.route.length - 1]);
      
      // 如果距離起點或終點很近，認為在這個段落
      if (distanceToStart < 500 || distanceToEnd < 500) {
        return segment;
      }
    }
    
    return this.routeSegments[0]; // 預設回傳第一個段落
  }

  // 取得下一個指令
  getNextInstruction(userPoint, segment) {
    let closestInstruction = null;
    let minDistance = Infinity;
    
    for (const instruction of segment.instructions) {
      const distance = this.calculateDistance(userPoint, instruction.position);
      if (distance < minDistance) {
        minDistance = distance;
        closestInstruction = instruction;
      }
    }
    
    return closestInstruction;
  }

  // 處理距離播報
  handleDistanceAnnouncement(instruction, distance) {
    const roundedDistance = Math.round(distance);
    
    // 播報時機：100m, 50m, 20m
    const announceDistances = [100, 50, 20];
    
    for (const announceDistance of announceDistances) {
      if (roundedDistance <= announceDistance && 
          (this.lastSpokenDistance === null || this.lastSpokenDistance > announceDistance)) {
        
        let message = '';
        if (roundedDistance <= 20) {
          message = instruction.text;
        } else {
          message = `${announceDistance}公尺後${instruction.text}`;
        }
        
        this.speak(message);
        this.lastSpokenDistance = announceDistance;
        break;
      }
    }
  }

  // 手動播報當前狀態
  announceCurrentStatus() {
    if (!this.isEnabled) {
      this.speak('語音導航未啟用');
      return;
    }
    
    if (!window.currentRouteData) {
      this.speak('尚未規劃路線');
      return;
    }
    
    if (!this.lastPosition) {
      this.speak('正在取得位置資訊');
      return;
    }
    
    // 播報當前路線狀態
    this.announceRouteOverview(window.currentRouteData);
  }

  // 緊急播報（高優先級）
  announceEmergency(message) {
    this.speak(message, 'high');
  }
}

// 建立全域語音導航實例
window.voiceNavigation = new VoiceNavigation();

// 在路線更新時自動分析
const originalReroute = window.reroute;
if (originalReroute) {
  window.reroute = async function() {
    await originalReroute.call(this);
    
    // 路線更新後分析語音導航
    if (window.currentRouteData && window.voiceNavigation.isEnabled) {
      setTimeout(() => {
        window.voiceNavigation.announceRouteOverview(window.currentRouteData);
      }, 1000);
    }
  };
}

// 位置更新時提供導航指引
if (window.positionModule) {
  const originalOnPositionUpdate = window.positionModule.onPositionUpdate;
  if (originalOnPositionUpdate) {
    window.positionModule.onPositionUpdate = function(position) {
      originalOnPositionUpdate.call(this, position);
      
      // 更新語音導航
      if (window.voiceNavigation) {
        window.voiceNavigation.updateNavigation(position);
      }
    };
  }
}

// 暴露控制函數
window.toggleVoiceNavigation = () => window.voiceNavigation.toggleVoiceNavigation();
window.announceCurrentStatus = () => window.voiceNavigation.announceCurrentStatus();

console.log('🎤 語音導航模組載入完成');