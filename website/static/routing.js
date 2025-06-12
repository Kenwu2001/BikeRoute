import { speakFromTemplate } from './speak.js';

let routingControl;
let instructions = [];
let currentInstructionIndex = 0;
const VOICE_THRESHOLD = 50;

export function setupRouting(map) {
  routingControl = L.Routing.control({
    router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
    lineOptions: { styles: [{ color: '#1E90FF', weight: 5 }] },
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoute: true,
    showAlternatives: false
  }).addTo(map);

  routingControl.on('routesfound', function (e) {
    const route = e.routes[0];
    instructions = route.instructions.map((instr) => {
      // 自動加入語音模板
      const processed = { ...instr };

      const dir = guessDirection(instr.text); // 中文方向詞
      const dist = Math.round(instr.distance || 50).toString(); // 公尺數字字串

      // 指令套用模板，這裡預設使用 turn_generic
      processed.templateId = "turn_generic";
      processed.params = {
        distance: dist,
        direction: dir
      };

      return processed;
    });

    currentInstructionIndex = 0;
  });

  return routingControl;
}

// 自動判斷方向詞（從英文推論中文）
function guessDirection(text = "") {
  const t = text.toLowerCase();
  if (t.includes("left")) return "左轉";
  if (t.includes("right")) return "右轉";
  if (t.includes("slight right")) return "靠右";
  if (t.includes("slight left")) return "靠左";
  if (t.includes("continue") || t.includes("straight")) return "直行";
  return "前進";
}

// 每次定位更新時，確認是否要播報語音
export function checkInstructionTrigger(currentLatLng) {
  if (currentInstructionIndex < instructions.length) {
    const instr = instructions[currentInstructionIndex];
    const instrLatLng = instr.latLng || L.latLng(instr.location);
    const dist = currentLatLng.distanceTo(instrLatLng);

    if (dist <= VOICE_THRESHOLD) {
      speakFromTemplate(instr.templateId, instr.params);
      currentInstructionIndex++;
    }
  }
}

export function setRoute(startLatLng, destLatLng) {
  routingControl.setWaypoints([startLatLng, destLatLng]);
}
