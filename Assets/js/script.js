
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Check for saved theme in localStorage or default to light mode
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark'); // Apply dark mode if saved
} else {
    body.classList.remove('dark'); // Ensure it's in light mode by default
}

// Ensure the correct logo is displayed on page load
const updateLogos = () => {
    const logoDark = document.querySelector('.logo-dark');
    const logoLight = document.querySelector('.logo-light');
    if (body.classList.contains('dark')) {
        logoDark.style.display = 'none';
        logoLight.style.display = 'block';
    } else {
        logoDark.style.display = 'block';
        logoLight.style.display = 'none';
    }
};
updateLogos(); // Run on page load

// Toggle theme on button click
themeToggle.addEventListener('click', () => {
    const isDarkMode = body.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    updateLogos();
});

// GPS File Upload and Processing
const gpsUpload = document.getElementById('gpsUpload');
const processFileButton = document.getElementById('processFile');
const totalDistanceDiv = document.getElementById('totalDistance');
const topSpeedDiv = document.getElementById('topSpeed');

processFileButton.addEventListener('click', () => {
    const file = gpsUpload.files[0];
    if (!file) {
        alert('Please upload a file first!');
        return;
    }

    const fileReader = new FileReader();
    fileReader.onload = event => {
        const fileContent = event.target.result;

        // Check file type and parse
        if (file.name.endsWith('.csv')) {
            parseCSV(fileContent);
        } else if (file.name.endsWith('.gpx')) {
            parseGPX(fileContent);
        } else if (file.name.endsWith('.json')) {
            parseJSON(fileContent);
        } else {
            alert('Unsupported file format. Please upload a .csv, .gpx, or .json file.');
        }
    };
    fileReader.readAsText(file);
});

function parseCSV(content) {
    const data = Papa.parse(content, { header: true }).data; // Use PapaParse for CSV parsing
    processGPSData(data);
}

function parseGPX(content) {
    const parser = new DOMParser();
    const gpx = parser.parseFromString(content, 'application/xml');
    const trackPoints = Array.from(gpx.getElementsByTagName('trkpt'));
    const data = trackPoints.map(pt => ({
        lat: parseFloat(pt.getAttribute('lat')),
        lon: parseFloat(pt.getAttribute('lon')),
        time: pt.getElementsByTagName('time')[0]?.textContent
    }));
    processGPSData(data);
}

function parseJSON(content) {
    const data = JSON.parse(content);
    processGPSData(data);
}

function processGPSData(data) {
    const coordinates = data.map(d => [parseFloat(d.lon), parseFloat(d.lat)]);
    const totalDistance = calculateTotalDistance(coordinates);
    const topSpeed = calculateTopSpeed(data);

    totalDistanceDiv.textContent = `Total Distance: ${totalDistance.toFixed(2)} miles`;
    topSpeedDiv.textContent = `Top Speed: ${topSpeed.toFixed(2)} mph`;

    initializeMap(coordinates); // Render on the map
}

// Initialize Mapbox Map
let map;
function initializeMap(coordinates) {
    if (!map) {
        // Create the map if it doesn't already exist
        mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: coordinates[0], // Center on the first coordinate
            zoom: 12 // Default zoom level
        });
    } else {
        // Clear previous data and fit new data
        map.flyTo({ center: coordinates[0], zoom: 12 });
    }

    // Add route line or waypoints
    const geoJson = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: coordinates
        }
    };

    if (map.getSource('route')) {
        map.getSource('route').setData(geoJson);
    } else {
        map.addSource('route', { type: 'geojson', data: geoJson });
        map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {},
            paint: {
                'line-color': '#0077b6',
                'line-width': 4
            }
        });
    }
}

// Calculate Total Distance in Miles
function calculateTotalDistance(coordinates) {
    let distance = 0;
    for (let i = 1; i < coordinates.length; i++) {
        const [lon1, lat1] = coordinates[i - 1];
        const [lon2, lat2] = coordinates[i];
        distance += calculateDistance(lat1, lon1, lat2, lon2);
    }
    return distance;
}

// Calculate Distance Using Haversine Formula (in Miles)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth's radius in miles
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateTopSpeed(data) {
    const speeds = data.map(d => (d.speed || 0) * 2.23694); // m/s to mph
    return Math.max(...speeds);
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
