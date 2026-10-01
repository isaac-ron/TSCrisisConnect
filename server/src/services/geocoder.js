// Geocoding with OpenStreetMap Nominatim (free; usage policy: max 1 request/second, identify the app).
import { logger } from '../logger.js';

const log = logger.child({ module: 'geocoder' });
const CACHE_LIMIT = 1000;
// Repeated reports name the same places; caching also keeps us within Nominatim's rate limit
const cache = new Map();

/**
 * @param {string} locationText e.g. "Kilimani, Nairobi"
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export async function geocodeLocation(locationText) {
  const query = locationText?.trim();
  if (!query) return null;
  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  let result = null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CrisisConnect/1.0 (community crisis reporting)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Nominatim responded ${response.status}`);
    const [match] = await response.json();
    if (match) result = { latitude: parseFloat(match.lat), longitude: parseFloat(match.lon) };
  } catch (error) {
    log.warn({ err: error.message, query }, 'geocoding failed');
    return null;   // don't cache failures
  }

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, result);
  return result;
}
