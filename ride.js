let map;
let pickupMarker, destinationMarker;
let routingControl;
let isPickupSet = false;
let isDestinationSet = false;
const ratePerKm = 15; // Cost per kilometer

// Initialize the map
function initMap() {
  const chennaiCoords = [13.0827, 80.2707]; // Latitude, Longitude
  map = L.map("map").setView(chennaiCoords, 12); // Set initial center and zoom level
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  map.on("click", function (e) {
    const { lat, lng } = e.latlng;
    if (!isPickupSet) {
      setLocation("pickup", lat, lng);
      getAddress(lat, lng, "pickup"); // Fetch and display address
      isPickupSet = true;
    } else if (!isDestinationSet) {
      setLocation("destination", lat, lng);
      getAddress(lat, lng, "destination"); // Fetch and display address
      isDestinationSet = true;
    } else {
      alert(
        'Both pickup and destination are already set. Click "Find Ride" to proceed or clear them to set new locations.'
      );
    }
  });
}

// Set a marker for pickup or destination
function setLocation(type, lat, lng) {
  const title = type.charAt(0).toUpperCase() + type.slice(1);

  if (type === "pickup") {
    if (pickupMarker) map.removeLayer(pickupMarker);
    pickupMarker = L.marker([lat, lng]).addTo(map).bindPopup(title).openPopup();
  } else {
    if (destinationMarker) map.removeLayer(destinationMarker);
    destinationMarker = L.marker([lat, lng])
      .addTo(map)
      .bindPopup(title)
      .openPopup();
  }
}

// Fetch address from lat, lng using geocoding API
function getAddress(lat, lng, type) {
  const geocodeURL =
    "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
    lat +
    "&lon=" +
    lng +
    "&addressdetails=1";

  fetch(geocodeURL)
    .then((response) => response.json())
    .then((data) => {
      const address = data.display_name;
      document.getElementById(type).value = address; // Set address in the input field
    })
    .catch((error) => {
      console.error("Error fetching address:", error);
      alert("Error fetching address: " + error.message);
    });
}

// Fetch ride options based on pickup and destination inputs
document.getElementById("findRide").addEventListener("click", function () {
  const pickup = document.getElementById("pickup").value;
  const destination = document.getElementById("destination").value;
  const rideOptionsDiv = document.getElementById("rideOptions");
  rideOptionsDiv.innerHTML = "";

  const geocodeURL =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=";

  Promise.all([
    fetch(geocodeURL + encodeURIComponent(pickup)).then((response) =>
      response.json()
    ),
    fetch(geocodeURL + encodeURIComponent(destination)).then((response) =>
      response.json()
    ),
  ])
    .then(([pickupResults, destinationResults]) => {
      let pickupLocation, destinationLocation;

      if (pickupResults.length > 0) {
        pickupLocation = [pickupResults[0].lat, pickupResults[0].lon];
        setLocation("pickup", pickupLocation[0], pickupLocation[1]);
        map.setView(pickupLocation, 13);
      } else {
        alert("Pickup location not found.");
        return;
      }

      if (destinationResults.length > 0) {
        destinationLocation = [
          destinationResults[0].lat,
          destinationResults[0].lon,
        ];
        setLocation(
          "destination",
          destinationLocation[0],
          destinationLocation[1]
        );

        if (routingControl) map.removeControl(routingControl);
        routingControl = L.Routing.control({
          waypoints: [
            L.latLng(pickupLocation[0], pickupLocation[1]),
            L.latLng(destinationLocation[0], destinationLocation[1]),
          ],
          routeWhileDragging: true,
        }).addTo(map);

        // Calculate distance and pricing options
        const distance =
          map.distance(pickupLocation, destinationLocation) / 1000; // in kilometers
        const price = (distance * ratePerKm).toFixed(2) + " ₹";

        const rideOptions = [
          { type: "Economy", price: price },
          {
            type: "Premium",
            price: (distance * ratePerKm * 1.5).toFixed(2) + " ₹",
          },
          { type: "SUV", price: (distance * ratePerKm * 2).toFixed(2) + " ₹" },
        ];

        rideOptions.forEach((option) => {
          const rideOptionDiv = document.createElement("div");
          rideOptionDiv.classList.add("ride-option");

          const rideInfo = document.createElement("span");
          rideInfo.textContent = `${option.type} - ${option.price}`;

          const bookButton = document.createElement("button");
          bookButton.textContent = "Book";
          bookButton.addEventListener("click", () => onBook(option.type));

          rideOptionDiv.appendChild(rideInfo);
          rideOptionDiv.appendChild(bookButton);
          rideOptionsDiv.appendChild(rideOptionDiv);
        });

        // Store the ride details in localStorage
        localStorage.setItem(
          "rideHistory",
          JSON.stringify({
            pickup: pickup,
            destination: destination,
            options: rideOptions,
          })
        );
      } else {
        alert("Destination location not found.");
      }
    })
    .catch((error) => {
      console.error("Error fetching location:", error);
      alert("Error fetching location data: " + error.message);
    });
});

// Clear the pickup and destination markers
document.getElementById("clearMarking").addEventListener("click", function () {
  clearMarkers();
});

function clearMarkers() {
  if (pickupMarker) {
    map.removeLayer(pickupMarker);
    pickupMarker = null;
  }
  if (destinationMarker) {
    map.removeLayer(destinationMarker);
    destinationMarker = null;
  }
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
  isPickupSet = false;
  isDestinationSet = false;
  document.getElementById("pickup").value = "";
  document.getElementById("destination").value = "";
}

// Book the ride and generate OTP
function onBook(rideType) {
  const otp = generateOTP();
  document.getElementById(
    "otpDisplay"
  ).textContent = `Booking confirmed for ${rideType}. Your OTP is: ${otp}`;
}

// Generate a random OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}

// Call initMap on page load to initialize the map
window.onload = initMap;
