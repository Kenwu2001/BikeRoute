const locationInfo = document.getElementById("location-info");

let lastPosition = null;
let watchId = null;
let updateCount = 0;

// Detect if user is on mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Check if we're on HTTPS (required for geolocation on most browsers)
const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// Geolocation options optimized for mobile
const geoOptions = {
    enableHighAccuracy: true,
    timeout: isMobile ? 15000 : 20000,
    maximumAge: 1000  // Allow 1 second old positions
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
        // Use different thresholds for mobile vs desktop
        const threshold = isMobile ? 0.3 : 2.0; // 0.3m for mobile, 2m for desktop
        shouldUpdate = distance > threshold;
    }

    if (shouldUpdate) {
        lastPosition = currentPosition;
        
        const timeStr = new Date(currentPosition.timestamp).toLocaleTimeString();
        let infoText = `Device: ${isMobile ? 'Mobile' : 'Desktop'}\n`;
        infoText += `Lat: ${currentPosition.latitude.toFixed(6)}, Lng: ${currentPosition.longitude.toFixed(6)}\n`;
        infoText += `Accuracy: ±${Math.round(currentPosition.accuracy)}m\n`;
        infoText += `Time: ${timeStr}\n`;
        infoText += `Updates: ${updateCount}`;
        if (distance > 0) {
            infoText += `\nMoved: ${distance.toFixed(1)}m`;
        }
        
        locationInfo.textContent = infoText;
        
        // Visual feedback for accuracy
        if (currentPosition.accuracy <= 10) {
            locationInfo.style.color = 'green';
        } else if (currentPosition.accuracy <= 50) {
            locationInfo.style.color = 'orange';
        } else {
            locationInfo.style.color = 'red';
        }
        
        console.log(`Location updated: ${currentPosition.latitude}, ${currentPosition.longitude}, accuracy: ${currentPosition.accuracy}m, device: ${isMobile ? 'mobile' : 'desktop'}`);
    } else {
        const threshold = isMobile ? 0.3 : 2.0;
        console.log(`Location change too small: ${distance.toFixed(2)}m (threshold: ${threshold}m)`);
        // Still update the counter and time to show activity
        const timeStr = new Date(currentPosition.timestamp).toLocaleTimeString();
        const lines = locationInfo.textContent.split('\n');
        lines[2] = `Time: ${timeStr}`;
        lines[3] = `Updates: ${updateCount}`;
        locationInfo.textContent = lines.join('\n');
    }
}

// Error callback for geolocation
function onLocationError(error) {
    let errorMessage = '';
    let troubleshoot = '';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = "Location access denied";
            troubleshoot = "Click the location icon in your browser's address bar and allow location access";
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = "Location unavailable";
            troubleshoot = "Try refreshing the page or check if location services are enabled";
            break;
        case error.TIMEOUT:
            errorMessage = "Location request timed out";
            troubleshoot = "Make sure you're near a window or outside for better GPS signal";
            break;
        default:
            errorMessage = "Unknown location error";
            troubleshoot = "Try refreshing the page";
            break;
    }
    
    locationInfo.innerHTML = `<strong>Error:</strong> ${errorMessage}<br><small>${troubleshoot}</small>`;
    locationInfo.style.color = 'red';
    console.error('Geolocation error:', error);
}

// Check if geolocation is supported and get permission status
async function checkLocationPermission() {
    if (!navigator.geolocation) {
        locationInfo.textContent = "Geolocation not supported by this browser";
        locationInfo.style.color = 'red';
        return false;
    }

    // Check if we're on HTTPS (required for geolocation)
    if (!isSecure) {
        locationInfo.innerHTML = `<strong>HTTPS Required</strong><br><small>Geolocation requires HTTPS. Deploy to Render or use localhost.</small>`;
        locationInfo.style.color = 'red';
        return false;
    }

    // Check permission status if available
    if (navigator.permissions) {
        try {
            const permission = await navigator.permissions.query({name: 'geolocation'});
            console.log('Geolocation permission status:', permission.state);
            
            if (permission.state === 'denied') {
                locationInfo.innerHTML = `<strong>Location access denied</strong><br><small>Enable location permissions in your browser settings</small>`;
                locationInfo.style.color = 'red';
                return false;
            }
        } catch (e) {
            console.log('Permission API not available');
        }
    }
    
    return true;
}

// Start location tracking
async function startLocationTracking() {
    const canUseLocation = await checkLocationPermission();
    if (!canUseLocation) return;
    
    locationInfo.textContent = "Requesting location permission...";
    locationInfo.style.color = 'blue';
    
    // Start watching position with optimized options
    watchId = navigator.geolocation.watchPosition(
        onLocationSuccess,
        onLocationError,
        geoOptions
    );
    
    console.log('Started location tracking with watchId:', watchId);
}

// Stop location tracking
function stopLocationTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        locationInfo.textContent = "Location tracking stopped";
        locationInfo.style.color = 'gray';
        console.log('Stopped location tracking');
    }
}

// Start tracking when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, starting location tracking');
    console.log('Device type:', isMobile ? 'Mobile' : 'Desktop');
    console.log('Protocol:', location.protocol);
    console.log('Is secure:', isSecure);
    
    if (!isSecure) {
        locationInfo.innerHTML = `<strong>⚠️ HTTPS Required</strong><br>Geolocation requires HTTPS.<br>Deploy to Render to test on mobile.<br><br><small>Current URL: ${location.href}</small>`;
        locationInfo.style.color = 'red';
        return;
    }
    
    if (!isMobile) {
        locationInfo.innerHTML = `<strong>⚠️ Desktop Detected</strong><br>For best results, open this on your phone.<br>Desktop location is often inaccurate and won't change when walking.<br><br>Fetching location...`;
        locationInfo.style.color = 'orange';
    }
    
    startLocationTracking();
});

// Optional: Add visibility change listener to optimize battery usage
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Page hidden');
        // Page is hidden, you might want to reduce update frequency
        // For now, we'll keep it running
    } else {
        console.log('Page visible');
        // Page is visible, ensure tracking is active
        if (watchId === null) {
            startLocationTracking();
        }
    }
});

// Add manual refresh button for testing
window.refreshLocation = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError, geoOptions);
    }
};