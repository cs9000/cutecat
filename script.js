
// Load weather on page load if zip code exists and display recent zip codes
document.addEventListener('DOMContentLoaded', function() {
  // Display recent zip codes
  updateRecentZipCodes();
  
  const savedZip = localStorage.getItem('userZipCode');
  if (savedZip) {
    document.getElementById("zipInput").value = savedZip;
    getGridInfo(true);
  }
  
  // Add event listener for Enter key in the zip input
  document.getElementById("zipInput").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      getGridInfo();
    }
  });
});

// Function to update and display the recent zip codes
function updateRecentZipCodes() {
  let recentZips = JSON.parse(localStorage.getItem('recentZipCodes')) || [];
  const recentZipsContainer = document.getElementById("recent-zips");
  
  if (recentZips.length > 0) {
    let html = '<div class="recent-zips-label">Recent searches:</div>';
    recentZips.forEach(zip => {
      html += `<a href="#" class="zip-link" data-zip="${zip}">${zip}</a>`;
    });
    recentZipsContainer.innerHTML = html;
    
    // Add click event listeners to the zip code links
    document.querySelectorAll('.zip-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const zip = this.getAttribute('data-zip');
        document.getElementById("zipInput").value = zip;
        getGridInfo();
      });
    });
  } else {
    recentZipsContainer.innerHTML = '';
  }
}

async function getGridInfo(skipZipCheck = false) {
  console.log("Fetching weather data...");
  const zipCode = document.getElementById("zipInput").value;
  const output = document.getElementById("output");
  
  if (!zipCode && !skipZipCheck) {
    output.textContent = "Please enter a ZIP code.";
    return;
  }
  
  // Save the zip code to localStorage and update recent zip codes
  if (zipCode) {
    localStorage.setItem('userZipCode', zipCode);
    
    // Update the recent zip codes list
    let recentZips = JSON.parse(localStorage.getItem('recentZipCodes')) || [];
    
    // Remove the zip code if it already exists in the list
    recentZips = recentZips.filter(zip => zip !== zipCode);
    
    // Add the new zip code to the beginning of the array
    recentZips.unshift(zipCode);
    
    // Keep only the three most recent zip codes
    recentZips = recentZips.slice(0, 3);
    
    // Save the updated list back to localStorage
    localStorage.setItem('recentZipCodes', JSON.stringify(recentZips));
    
    // Update the displayed recent zip codes
    updateRecentZipCodes();
  }

  output.innerHTML = "Loading location data...";
  document.getElementById("forecast-display").innerHTML = "Loading forecast...";

  try {
    // Get latitude and longitude from OpenStreetMap Nominatim API
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=us&format=json`
    );
    const geoData = await geoResponse.json();

    if (!geoData.length) {
      output.textContent = "Invalid ZIP code or location not found.";
      return;
    }

    const { lat, lon } = geoData[0];

    // Get NWS grid info using the latitude and longitude
    const nwsResponse = await fetch(
      `https://api.weather.gov/points/${lat},${lon}`
    );
    const nwsData = await nwsResponse.json();

    if (!nwsData.properties) {
      output.textContent = "Error retrieving NWS grid information.";
      return;
    }

    const { gridId, gridX, gridY } = nwsData.properties;
    const forecastUrl = nwsData.properties.forecast;
    
    // Get the forecast data using the forecast URL from the points response
    const forecastResponse = await fetch(forecastUrl);
    const forecastData = await forecastResponse.json();
    
    if (!forecastData.properties || !forecastData.properties.periods) {
      output.textContent = "Error retrieving forecast information.";
      return;
    }
    
    const periods = forecastData.properties.periods;
    
    // Extract location name without zip code
    let locationName = "";
    if (geoData[0].display_name) {
      // Get display name and remove zip code
      const addressParts = geoData[0].display_name.split(',');
      // Find the part that has the zip code and skip it
      for (let i = 0; i < addressParts.length; i++) {
        if (addressParts[i].trim().match(/^\d{5}(-\d{4})?$/)) {
          continue; // Skip the zip code part
        }
        // Use the first non-zip code part
        locationName = addressParts[i].trim();
        break;
      }
      
      // If no location was found, use the first part as fallback
      if (!locationName && addressParts.length > 0) {
        locationName = addressParts[0].trim();
      }
    }
    
    // Create forecast HTML for the top section with location name
    let forecastHtml = `
      <h3>${locationName}</h3>
      <div class="forecast-container">
    `;
    
    // Add the first 5 periods (or fewer if not available)
    const periodsToShow = Math.min(periods.length, 5);
    for (let i = 0; i < periodsToShow; i++) {
      const period = periods[i];
      forecastHtml += `
        <div class="forecast-period collapsed">
          <div class="forecast-content">
            <h4>${period.name}</h4>
            <img src="${period.icon}" alt="${period.shortForecast}" style="width:50px;height:50px;">
            <p><strong>Temperature:</strong> ${period.temperature}${period.temperatureUnit}    <strong>Wind:</strong> ${period.windSpeed} ${period.windDirection}</p>
            <p>${period.shortForecast}</p>
            <p class="forecast-detail hidden">${period.detailedForecast}</p>
          </div>
        </div>
      `;
    }
    
    forecastHtml += `</div>`;
    
    // Create location info HTML for the bottom section
    let locationHtml = `
      <div class="location-info">
        <strong>ZIP Code:</strong> ${zipCode} <br>
        <strong>Latitude:</strong> ${lat}, <strong>Longitude:</strong> ${lon} <br>
        <strong>NWS Grid ID:</strong> ${gridId} <br>
        <strong>Grid X:</strong> ${gridX}, <strong>Grid Y:</strong> ${gridY}
      </div>
    `;
    
    // Display the results
    document.getElementById("forecast-display").innerHTML = forecastHtml;
    output.innerHTML = locationHtml;
    
    // Add click event listeners to the forecast periods
    document.querySelectorAll('.forecast-period').forEach(box => {
      box.addEventListener('click', function() {
        this.classList.toggle('collapsed');
        const detailEl = this.querySelector('.forecast-detail');
        detailEl.classList.toggle('hidden');
      });
    });
  } catch (error) {
    output.textContent = "An error occurred while fetching data.";
    console.error(error);
  }
}
