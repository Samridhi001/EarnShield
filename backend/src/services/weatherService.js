const axios = require('axios');

/**
 * Weather Service — fetches live environmental conditions per zone.
 *
 * Falls back to mock data if the API is unavailable or the key isn't active
 * yet, so development and demos aren't blocked by external service issues.
 * The fallback is clearly marked in the response so callers know the data
 * isn't real — important for not silently making decisions on fake data.
 */

// Zone centroid coordinates — used for API lookups
const ZONE_COORDINATES = {
  'Bhubaneswar-Zone1': { lat: 20.2760, lng: 85.8245 },
  'Bhubaneswar-Zone2': { lat: 20.3000, lng: 85.8500 },
  'Cuttack-Zone1': { lat: 20.4625, lng: 85.8830 },
  'Rourkela-Zone1': { lat: 22.2604, lng: 84.8536 },
  'Puri-Zone1': { lat: 19.8135, lng: 85.8312 },
};

const API_KEY = process.env.OPENWEATHER_API_KEY;

/**
 * Fetches current weather + air quality for a zone.
 * @returns {{ rainfallMm, temperatureC, aqi, source, fetchedAt }}
 */
const getWeatherForZone = async (zone) => {
  const coords = ZONE_COORDINATES[zone];
  if (!coords) {
    throw new Error(`Unknown zone: ${zone}`);
  }

  try {
    // Current weather (temperature, rainfall)
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lng}&appid=${API_KEY}&units=metric`;
    const weatherRes = await axios.get(weatherUrl, { timeout: 5000 });

    // Air quality (separate endpoint)
    const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${coords.lat}&lon=${coords.lng}&appid=${API_KEY}`;
    const aqiRes = await axios.get(aqiUrl, { timeout: 5000 });

    // OpenWeather returns rain volume for last 1h (if any) under rain['1h']
    const rainfallMm = weatherRes.data.rain?.['1h'] || 0;
    const temperatureC = weatherRes.data.main.temp;

    // OpenWeather's AQI is a 1-5 index, not the 0-500 scale we use.
    // Convert using their PM2.5 concentration instead for a comparable value.
    const pm25 = aqiRes.data.list[0]?.components?.pm2_5 || 0;
    const aqi = convertPm25ToAqi(pm25);

    return {
      rainfallMm,
      temperatureC,
      aqi,
      source: 'openweather',
      fetchedAt: new Date(),
    };
  } catch (error) {
    console.warn(`Weather API failed for ${zone} (${error.message}) — using mock data`);
    return getMockWeather(zone);
  }
};

/**
 * Converts PM2.5 concentration (µg/m³) to the US EPA AQI scale (0-500),
 * which is what our thresholds are based on.
 */
const convertPm25ToAqi = (pm25) => {
  const breakpoints = [
    { cLow: 0, cHigh: 12, aqiLow: 0, aqiHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, aqiLow: 151, aqiHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, aqiLow: 201, aqiHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, aqiLow: 301, aqiHigh: 500 },
  ];

  const bp = breakpoints.find((b) => pm25 >= b.cLow && pm25 <= b.cHigh);
  if (!bp) return pm25 > 500.4 ? 500 : 0;

  return Math.round(
    ((bp.aqiHigh - bp.aqiLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.aqiLow
  );
};

/**
 * Mock fallback — deterministic per zone so testing is reproducible.
 */
const getMockWeather = (zone) => {
  const mockData = {
    'Bhubaneswar-Zone1': { rainfallMm: 8, temperatureC: 32, aqi: 95 },
    'Bhubaneswar-Zone2': { rainfallMm: 12, temperatureC: 33, aqi: 110 },
    'Cuttack-Zone1': { rainfallMm: 5, temperatureC: 34, aqi: 88 },
    'Rourkela-Zone1': { rainfallMm: 2, temperatureC: 36, aqi: 130 },
    'Puri-Zone1': { rainfallMm: 15, temperatureC: 30, aqi: 75 },
  };

  return {
    ...(mockData[zone] || { rainfallMm: 0, temperatureC: 30, aqi: 80 }),
    source: 'mock',
    fetchedAt: new Date(),
  };
};

module.exports = { getWeatherForZone, getMockWeather, convertPm25ToAqi, ZONE_COORDINATES };