// server/src/services/geocoder.js
// Geocoding service using OpenStreetMap Nominatim (free, online) or Pelias

/**
 * Geocodes a location string using OpenStreetMap Nominatim API.
 * @param {string} locationText - The location to geocode.
 * @returns {Promise<{latitude: number, longitude: number} | null>} Coordinates or null if not found.
 */
export async function geocodeWithNominatim(locationText) {
  if (!locationText || locationText.trim().length === 0) {
    return null;
  }

  const encodedLocation = encodeURIComponent(locationText);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CrisisConnect/1.0 (Crisis Response Application)' }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const latitude = parseFloat(data[0].lat);
      const longitude = parseFloat(data[0].lon);
      console.log(`[Geocoder] ✅ Nominatim: "${locationText}" -> [${latitude}, ${longitude}]`);
      return { latitude, longitude };
    }

    console.log(`[Geocoder] ⚠️ Nominatim: No results for "${locationText}"`);
    return null;

  } catch (error) {
    console.error(`[Geocoder] ❌ Nominatim error for "${locationText}":`, error.message);
    return null;
  }
}

/**
 * Geocodes a location string using Pelias API (requires self-hosted instance).
 * For demo purposes, this assumes a Pelias server running locally or at a known URL.
 * @param {string} locationText - The location to geocode.
 * @param {string} peliasUrl - The base URL of the Pelias instance (e.g., 'http://localhost:4000/v1').
 * @returns {Promise<{latitude: number, longitude: number} | null>} Coordinates or null if not found.
 */
export async function geocodeWithPelias(locationText, peliasUrl = 'http://localhost:4000/v1') {
  if (!locationText || locationText.trim().length === 0) {
    return null;
  }

  const encodedLocation = encodeURIComponent(locationText);
  const url = `${peliasUrl}/search?text=${encodedLocation}&size=1`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Pelias API failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.features && data.features.length > 0) {
      const coords = data.features[0].geometry.coordinates;
      const longitude = parseFloat(coords[0]);
      const latitude = parseFloat(coords[1]);
      console.log(`[Geocoder] ✅ Pelias: "${locationText}" -> [${latitude}, ${longitude}]`);
      return { latitude, longitude };
    }

    console.log(`[Geocoder] ⚠️ Pelias: No results for "${locationText}"`);
    return null;

  } catch (error) {
    console.error(`[Geocoder] ❌ Pelias error for "${locationText}":`, error.message);
    return null;
  }
}

/**
 * Main geocode function - defaults to Nominatim, with Pelias as fallback or option.
 * @param {string} locationText - The location to geocode.
 * @param {string} provider - 'nominatim' or 'pelias'.
 * @param {string} peliasUrl - URL for Pelias if using that provider.
 * @returns {Promise<{latitude: number, longitude: number} | null>} Coordinates or null.
 */
export async function geocodeLocation(locationText, provider = 'nominatim', peliasUrl) {
  switch (provider) {
    case 'pelias':
      return await geocodeWithPelias(locationText, peliasUrl);
    case 'nominatim':
    default:
      return await geocodeWithNominatim(locationText);
  }
}
