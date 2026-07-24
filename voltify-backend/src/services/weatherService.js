// src/services/weatherService.js
const dotenv = require('dotenv');
dotenv.config();

const CITY_COORDINATES = {
  'Chennai':   { lat: 13.0827, lon: 80.2707 },
  'Mumbai':    { lat: 19.0760, lon: 72.8777 },
  'Delhi':     { lat: 28.6139, lon: 77.2090 },
  'Bangalore': { lat: 12.9716, lon: 77.5946 },
  'Hyderabad': { lat: 17.3850, lon: 78.4867 },
  'Kolkata':   { lat: 22.5726, lon: 88.3639 },
};

/**
 * Fetches the current live temperature in Celsius for a given city location.
 * Implements a highly robust 3-layer fallback:
 * 1. Primary: WeatherAPI.com (user key)
 * 2. Secondary: Open-Meteo API (free coordinate query)
 * 3. Tertiary: Ambient seasonal climates
 */
const getLiveTemperature = async (location) => {
  const normalizedCity = Object.keys(CITY_COORDINATES).find(
    (city) => city.toLowerCase() === (location || '').trim().toLowerCase()
  ) || 'Chennai';

  const apiKey = process.env.WEATHER_API_KEY || '870f906d60af4d7d88970251260106';

  // 1. Primary: WeatherAPI.com
  try {
    const url = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${normalizedCity}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const temp = data.current?.temp_c;
      if (typeof temp === 'number') {
        console.log(`[Voltify Weather] WeatherAPI.com: Current temperature for ${normalizedCity} is ${temp}°C`);
        return temp;
      }
    }
  } catch (err) {
    console.warn(`[Voltify Weather] WeatherAPI.com query failed: ${err.message}. Trying secondary source.`);
  }

  // 2. Secondary: Open-Meteo
  try {
    const coords = CITY_COORDINATES[normalizedCity];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const temp = data.current?.temperature_2m;
      if (typeof temp === 'number') {
        console.log(`[Voltify Weather] Open-Meteo: Current temperature for ${normalizedCity} is ${temp}°C`);
        return temp;
      }
    }
  } catch (err) {
    console.warn(`[Voltify Weather] Open-Meteo fallback failed: ${err.message}`);
  }

  // 3. Tertiary: Seasonal Baseline Defaults
  console.log(`[Voltify Weather] Using ambient seasonal defaults for ${normalizedCity}`);
  const month = new Date().getMonth();
  if ([11, 0, 1].includes(month)) {
    return normalizedCity === 'Delhi' || normalizedCity === 'Kolkata' ? 16.0 : 22.0;
  }
  if ([3, 4, 5].includes(month)) {
    return 35.0; // Summer
  }
  return 28.0; // Standard ambient
};

module.exports = { getLiveTemperature, CITY_COORDINATES };
