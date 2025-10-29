// --- Global State Variables ---
let map;
let routeData = [];
let currentIndex = 0;
let simulationInterval = null;
let isPlaying = false;

// Leaflet Map Objects
let vehicleMarker;
let traveledPathPolyline;
let fullRoutePolyline;

// --- DOM Elements ---
const playPauseBtn = document.getElementById('playPauseBtn');
const currentCoordsEl = document.getElementById('currentCoords');
const currentTimestampEl = document.getElementById('currentTimestamp');
const currentSpeedEl = document.getElementById('currentSpeed');

// --- Configuration ---
const SIMULATION_SPEED_MS = 1000; // Update vehicle position every 1000ms (1 second)

// --- Utility Functions ---

/**
 * Calculates the distance between two geographical points using the Haversine formula.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// --- Map Initialization ---

function initMap() {
    // 1. Create the map and set initial view
    map = L.map('map').setView([routeData[0].latitude, routeData[0].longitude], 14);

    // 2. Add an OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 3. Draw the full planned route (light gray/dotted)
    const allCoords = routeData.map(p => [p.latitude, p.longitude]);
    fullRoutePolyline = L.polyline(allCoords, { 
        color: '#ccc', 
        weight: 5, 
        opacity: 0.6, 
        dashArray: '10, 10' 
    }).addTo(map);

    // Center map on the full route
    map.fitBounds(fullRoutePolyline.getBounds());

    // 4. Initialize the vehicle marker (custom icon for better visibility)
    const vehicleIcon = L.divIcon({
        className: 'vehicle-icon',
        html: '🚗',
        iconSize: [30, 30],
        iconAnchor: [15, 15] // Center the icon
    });

    const initialPos = [routeData[0].latitude, routeData[0].longitude];
    vehicleMarker = L.marker(initialPos, { icon: vehicleIcon, rotationAngle: 0 }).addTo(map);

    // 5. Initialize the traveled path polyline (red/solid)
    traveledPathPolyline = L.polyline([], { color: 'red', weight: 6 }).addTo(map);

    // 6. Update initial metadata
    updateMetadata(routeData[0]);
}

// --- Simulation Logic ---

/**
 * Updates the vehicle's position and the traveled path on the map.
 */
function updateVehiclePosition() {
    if (currentIndex >= routeData.length - 1) {
        clearInterval(simulationInterval);
        simulationInterval = null;
        isPlaying = false;
        playPauseBtn.textContent = "🔁 Replay Simulation";
        return;
    }

    const prevPoint = routeData[currentIndex];
    currentIndex++;
    const currentPoint = routeData[currentIndex];

    const currentLat = currentPoint.latitude;
    const currentLng = currentPoint.longitude;
    const newLatLng = [currentLat, currentLng];

    // 1. Smoothly move the marker (Leaflet's setLatLng is smooth enough for this)
    vehicleMarker.setLatLng(newLatLng);

    // 2. Extend the traveled path polyline
    const currentPath = traveledPathPolyline.getLatLngs();
    currentPath.push(newLatLng);
    traveledPathPolyline.setLatLngs(currentPath);

    // 3. Update metadata
    updateMetadata(currentPoint, prevPoint);
}

/**
 * Calculates and displays current speed and updates coordinates/timestamp.
 * @param {object} current - Current position object.
 * @param {object} previous - Previous position object (optional).
 */
function updateMetadata(current, previous = null) {
    currentCoordsEl.textContent = `${current.latitude.toFixed(5)}, ${current.longitude.toFixed(5)}`;
    currentTimestampEl.textContent = new Date(current.timestamp).toLocaleTimeString();

    if (previous) {
        // Calculate Time Difference (seconds)
        const timeDiffMs = new Date(current.timestamp) - new Date(previous.timestamp);
        const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

        // Calculate Distance (km)
        const distKm = haversineDistance(
            previous.latitude, previous.longitude,
            current.latitude, current.longitude
        );

        // Calculate Speed (km/h)
        const speedKmh = timeDiffHours > 0 ? (distKm / timeDiffHours).toFixed(2) : 0;
        
        currentSpeedEl.textContent = `${speedKmh} km/h`;
    } else {
        currentSpeedEl.textContent = "-- km/h (Start)";
    }
}

// --- Control Handlers ---

function toggleSimulation() {
    if (isPlaying) {
        // Pause
        clearInterval(simulationInterval);
        simulationInterval = null;
        playPauseBtn.textContent = "▶️ Play Simulation";
    } else {
        // Play or Replay
        if (currentIndex >= routeData.length - 1) {
            // Replay logic
            currentIndex = 0;
            traveledPathPolyline.setLatLngs([]); // Reset the path
            const firstPos = [routeData[0].latitude, routeData[0].longitude];
            vehicleMarker.setLatLng(firstPos); // Reset the marker
            updateMetadata(routeData[0]);
        }
        
        simulationInterval = setInterval(updateVehiclePosition, SIMULATION_SPEED_MS);
        playPauseBtn.textContent = "⏸️ Pause Simulation";
    }
    isPlaying = !isPlaying;
}

// --- Main Execution ---

async function loadDataAndRun() {
    try {
        const response = await fetch('dummy-route.json');
        routeData = await response.json();

        if (routeData.length === 0) {
            console.error("Route data is empty.");
            return;
        }

        initMap();
        playPauseBtn.addEventListener('click', toggleSimulation);

    } catch (error) {
        console.error("Error loading route data:", error);
    }
}

window.onload = loadDataAndRun;