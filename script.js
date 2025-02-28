
async function getGridInfo() {
  console.log("hello!");
  const zipCode = document.getElementById("zipInput").value;
  const output = document.getElementById("output");
  if (!zipCode) {
    output.textContent = "Please enter a ZIP code.";
    return;
  }

  output.innerHTML = "Loading data...";

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
    
    // Create forecast HTML
    let forecastHtml = `
      <div class="location-info">
        <strong>ZIP Code:</strong> ${zipCode} <br>
        <strong>Latitude:</strong> ${lat}, <strong>Longitude:</strong> ${lon} <br>
        <strong>NWS Grid ID:</strong> ${gridId} <br>
        <strong>Grid X:</strong> ${gridX}, <strong>Grid Y:</strong> ${gridY}
      </div>
      <h3>Weather Forecast</h3>
      <div class="forecast-container">
    `;
    
    // Add the first 5 periods (or fewer if not available)
    const periodsToShow = Math.min(periods.length, 5);
    for (let i = 0; i < periodsToShow; i++) {
      const period = periods[i];
      forecastHtml += `
        <div class="forecast-period">
          <h4>${period.name}</h4>
          <img src="${period.icon}" alt="${period.shortForecast}" style="width:50px;height:50px;">
          <p><strong>Temperature:</strong> ${period.temperature}${period.temperatureUnit}</p>
          <p><strong>Wind:</strong> ${period.windSpeed} ${period.windDirection}</p>
          <p>${period.shortForecast}</p>
          <p class="forecast-detail">${period.detailedForecast}</p>
        </div>
      `;
    }
    
    forecastHtml += `</div>`;
    
    // Display the results
    output.innerHTML = forecastHtml;
  } catch (error) {
    output.textContent = "An error occurred while fetching data.";
    console.error(error);
  }
}
