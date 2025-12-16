const functions = require('firebase-functions');
const icalGenerator = require('ical-generator');

// Helper function to fetch weather data from Visual Crossing
async function fetchWeatherData(city, units, includeParams = 'days,alerts') {
  const apiKey = process.env.VISUALCROSSING_KEY;
  const weatherUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(city)}?unitGroup=${units}&include=${includeParams}&key=${apiKey}&contentType=json`;
  
  console.log(`Weather API URL: ${weatherUrl}`);
  
  const weatherResponse = await fetch(weatherUrl);
  
  if (!weatherResponse.ok) {
    throw new Error(`Weather API Error: ${weatherResponse.status} ${weatherResponse.statusText}`);
  }
  
  return await weatherResponse.json();
}

// Function to get current weather for a location
exports.getCurrentWeather = functions.https.onRequest({
  invoker: ['public']
}, async (req, res) => {
  // Allow unauthenticated invocations
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
      // Handle preflight request
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).send('');
      return;
    }
    
    const city = req.query.city || 'Barcelona';
    const units = req.query.units === 'F' ? 'us' : 'metric';
    
    console.log(`Fetching current weather for city: ${city} with units: ${units}`);
    
    // Fetch only current conditions to minimize data transfer
    const weatherData = await fetchWeatherData(city, units, 'current');
    
    // Extract just the data we need
    const currentWeather = {
      resolvedAddress: weatherData.resolvedAddress,
      currentConditions: weatherData.currentConditions,
      timezone: weatherData.timezone
    };
    
    // Log the current conditions for debugging
    console.log('Current conditions:', JSON.stringify(weatherData.currentConditions));
    
    res.set('Content-Type', 'application/json');
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.status(200).send(currentWeather);
  } catch (error) {
    console.error('Function error:', error);
    res.status(500).send({ error: error.message });
  }
});

exports.weatherCal = functions.https.onRequest({
  invoker: ['public']
}, async (req, res) => {
  // Allow unauthenticated invocations
  try {
    // Enable CORS for calendar subscriptions
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    const city = req.query.city || 'Barcelona';
    const units = req.query.units === 'F' ? 'us' : 'metric';
    const mode = req.query.temperature === 'low-high' ? 'minmax' : 'daily';
    const apiKey = process.env.VISUALCROSSING_KEY;

    // 1️⃣ Fetch weather data from Visual Crossing
    console.log(`Fetching weather for city: ${city} with units: ${units}`);
    
    const weatherUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(city)}?unitGroup=${units}&include=alerts%2Cdays&key=${apiKey}&contentType=json`;
    console.log(`Weather API URL: ${weatherUrl}`);
    
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      console.error(`Weather API Error: ${weatherResponse.status} ${weatherResponse.statusText}`);
      return res.status(500).send(`Weather API Error: ${weatherResponse.status} ${weatherResponse.statusText}`);
    }
    
    const weatherData = await weatherResponse.json();
    console.log(`Weather data received for: ${weatherData.resolvedAddress}`);
    
    if (!weatherData.days || !Array.isArray(weatherData.days)) {
      console.error('Invalid API response format:', weatherData);
      return res.status(500).send('Invalid weather data format');
    }

    // 2️⃣ Build calendar
    const calendarName = `Weather for ${weatherData.resolvedAddress}`;
    const calendarDesc = `Daily weather forecast for ${weatherData.resolvedAddress} with temperature and conditions`;
    
    const cal = icalGenerator.default({ 
      name: calendarName,
      prodId: {
        company: 'weather-calendar',
        product: 'weather-in-calendar'
      },
      scale: 'gregorian',
      method: 'PUBLISH',
      // Add a unique URL for the calendar to help with subscriptions
      url: `https://us-central1-weather-in-calendar.cloudfunctions.net/weatherCal?city=${encodeURIComponent(city)}&units=${units === 'us' ? 'F' : 'C'}${mode === 'minmax' ? '&temperature=low-high' : ''}`
    });
    
    // Add additional calendar properties for better compatibility
    cal.x('X-WR-CALNAME', calendarName);
    cal.x('X-WR-CALDESC', calendarDesc);
    cal.x('X-PUBLISHED-TTL', 'PT1H'); // Refresh every hour
    cal.x('X-WR-TIMEZONE', 'UTC');
    
    // Remove the duplicate X-WR-CALNAME and X-WR-CALDESC at the end
    
    // Create calendar events for each day (up to 14 days)
    weatherData.days.slice(0, 14).forEach(day => {
      const dt = new Date(day.datetime);
      
      // Temperature title
      const titleTemp = mode === 'minmax'
        ? `${Math.round(day.tempmin)}°/${Math.round(day.tempmax)}°`
        : `${Math.round(day.temp)}°`;
      
      // Map weather condition to emoji
      const conditions = day.conditions.toLowerCase();
      let emoji = '';
      
      if (conditions.includes('thunder') || conditions.includes('tstorm')) {
        emoji = '⛈️';
      } else if (conditions.includes('rain') && conditions.includes('snow')) {
        emoji = '🌨️';
      } else if (conditions.includes('rain') && conditions.includes('partially cloudy')) {
        emoji = '🌦️'; // Sun behind rain cloud for "Rain, Partially cloudy"
      } else if (conditions.includes('drizzle')) {
        emoji = '🌦️';
      } else if (conditions.includes('rain')) {
        emoji = '🌧️';
      } else if (conditions.includes('snow')) {
        emoji = '❄️';
      } else if (conditions.includes('clear')) {
        emoji = '☀️';
      } else if (conditions.includes('partially cloudy')) {
        emoji = '🌤️';
      } else if (conditions.includes('overcast')) {
        emoji = '☁️';
      } else if (conditions.includes('cloud')) {
        emoji = '☁️';
      }  else if (conditions.includes('fog') || conditions.includes('mist')) {
        emoji = '🌫️';
      } else if (conditions.includes('dust') || conditions.includes('sand')) {
        emoji = '🌪️';
      }
      
      // Description block
      const descLines = [
        `Weather: ${day.conditions}`,
        `Temp: ${Math.round(day.temp)}° (min ${Math.round(day.tempmin)}° / max ${Math.round(day.tempmax)}°)`,
        `Feels like: ${Math.round(day.feelslike)}°`,
        `Humidity: ${day.humidity}%`,
        `Wind: ${day.windspeed} ${units === 'us' ? 'mph' : 'km/h'} @ ${day.winddir}°`,
        `Precipitation: ${day.precip} ${units === 'us' ? 'in' : 'mm'}`,
        `UV Index: ${day.uvindex}`
      ];
      
      // Add sunrise/sunset
      if (day.sunrise && day.sunset) {
        // Visual Crossing returns sunrise/sunset as strings like "06:45:00"
        // We need to combine with the date to create a valid Date object
        const datePart = day.datetime; // YYYY-MM-DD format
        const sunriseDateTime = new Date(`${datePart}T${day.sunrise}`);
        const sunsetDateTime = new Date(`${datePart}T${day.sunset}`);
        
        const sunriseTime = sunriseDateTime.toLocaleTimeString('en-GB');
        const sunsetTime = sunsetDateTime.toLocaleTimeString('en-GB');
        descLines.push(`Sun: ${sunriseTime} – ${sunsetTime}`);
      }
      
      // Add alerts if available
      if (weatherData.alerts && weatherData.alerts.length > 0) {
        const dayAlerts = weatherData.alerts.filter(alert => {
          const alertStart = new Date(alert.onset);
          const alertEnd = new Date(alert.ends);
          return dt >= alertStart && dt <= alertEnd;
        });
        
        if (dayAlerts.length > 0) {
          descLines.push('');
          descLines.push('⚠️ ALERTS ⚠️');
          dayAlerts.forEach(alert => {
            descLines.push(`${alert.event}: ${alert.headline}`);
          });
        }
      }
      
      const desc = descLines.join('\n');
      
      cal.createEvent({
        start: dt,
        allDay: true,
        summary: `${emoji} ${titleTemp}`,
        description: desc,
        location: weatherData.resolvedAddress
      });
    });

    // 3️⃣ Return ICS directly from the library (preserves CRLF line endings)
    const icsContent = cal.toString();
    
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'inline; filename="weather-calendar.ics"');
    res.set('Content-Length', Buffer.byteLength(icsContent, 'utf8'));
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.status(200).send(icsContent);
  } catch (error) {
    console.error('Function error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});
