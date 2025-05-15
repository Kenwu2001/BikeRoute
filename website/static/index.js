const locationInfo = document.getElementById("location-info");

// Watch the user's position in real-time
const watchId = navigator.geolocation.watchPosition(function(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    locationInfo.textContent = `Latitude: ${latitude}, Longitude: ${longitude}`;
}, function(error) {
    locationInfo.textContent = `Error getting location: ${error.message}`;
});