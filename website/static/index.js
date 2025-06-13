const locationInfo = document.getElementById("location-info");

let lastPosition = null;
let watchId = null;
let updateCount = 0;

// Simple geolocation options
const geoOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 1000
};

// Function to calculate distance between two positions (in meters)
function calculateDistance(pos1, pos2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.latitude * Math.PI/180;
    const φ2 = pos2.latitude * Math.PI/180;
    const Δφ = (pos2.latitude - pos1.latitude) * Math.PI/180;
    const Δλ = (pos2.longitude - pos1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

// Success callback for geolocation
function onLocationSuccess(position) {
    updateCount++;
    const currentPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
    };

    let shouldUpdate = false;
    let distance = 0;

    if (!lastPosition) {
        shouldUpdate = true;
    } else {
        distance = calculateDistance(lastPosition, currentPosition);
        shouldUpdate = distance > 1.0; // Simple 1 meter threshold
    }

    if (shouldUpdate) {
        lastPosition = currentPosition;
        
        const timeStr = new Date(currentPosition.timestamp).toLocaleTimeString();
        let infoText = `Lat: ${currentPosition.latitude.toFixed(6)}, Lng: ${currentPosition.longitude.toFixed(6)}\n`;
        infoText += `Accuracy: ±${Math.round(currentPosition.accuracy)}m\n`;
        infoText += `Time: ${timeStr}\n`;
        infoText += `Updates: ${updateCount}`;
        if (distance > 0) {
            infoText += `\nMoved: ${distance.toFixed(1)}m`;
        }
        
        locationInfo.textContent = infoText;
        locationInfo.style.color = 'black';
        
        console.log(`Location updated: ${currentPosition.latitude}, ${currentPosition.longitude}`);
    }
}

// Simple error callback
function onLocationError(error) {
    locationInfo.textContent = "Location error: " + error.message;
    locationInfo.style.color = 'red';
    console.error('Location error:', error);
}

// Start location tracking
function startLocationTracking() {
    if (!navigator.geolocation) {
        locationInfo.textContent = "Geolocation not supported";
        return;
    }
    
    locationInfo.textContent = "Getting location...";
    
    watchId = navigator.geolocation.watchPosition(
        onLocationSuccess,
        onLocationError,
        geoOptions
    );
}

// Stop location tracking
function stopLocationTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        locationInfo.textContent = "Location tracking stopped";
        locationInfo.style.color = 'gray';
    }
}

// Start tracking when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, auto-starting location tracking');
    
    // Start location tracking
    startLocationTracking();
});