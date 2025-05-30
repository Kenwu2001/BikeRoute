import { speak } from './speak.js';

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
    instructions = route.instructions || [];
    currentInstructionIndex = 0;
  });

  return routingControl;
}

export function checkInstructionTrigger(currentLatLng) {
  if (currentInstructionIndex < instructions.length) {
    const instr = instructions[currentInstructionIndex];
    let instrLatLng = instr.latLng || L.latLng(instr.location);
    const dist = currentLatLng.distanceTo(instrLatLng);
    if (dist <= VOICE_THRESHOLD) {
      speak(instr.text);
      currentInstructionIndex++;
    }
  }
}

export function setRoute(startLatLng, destLatLng) {
  routingControl.setWaypoints([startLatLng, destLatLng]);
}
