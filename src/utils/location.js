/**
 * Location utility functions for GPS verification
 */

/**
 * Restaurant location in Rio de Janeiro
 * R. Alm. Alexandrino, 5 - Santa Teresa
 */
const RESTAURANT_LOCATION = {
  latitude: -22.919064,
  longitude: -43.183182,
  name: 'R. Alm. Alexandrino, 5 - Santa Teresa, Rio de Janeiro'
};

/**
 * Acceptance radius in meters (200m = ~1 block)
 */
const ACCEPTANCE_RADIUS_METERS = 200;

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters

  const toRad = (deg) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  return Math.round(distance);
}

/**
 * Verify if GPS coordinates are within acceptance radius of restaurant
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude
 * @returns {object} Verification result with distance and verified status
 */
function verifyLocation(latitude, longitude) {
  if (!latitude || !longitude) {
    return {
      verified: false,
      distance: null,
      message: 'GPS não fornecido'
    };
  }

  const distance = calculateDistance(
    latitude,
    longitude,
    RESTAURANT_LOCATION.latitude,
    RESTAURANT_LOCATION.longitude
  );

  const verified = distance <= ACCEPTANCE_RADIUS_METERS;

  return {
    verified,
    distance,
    message: verified
      ? `✅ Dentro do raio (${distance}m)`
      : `⚠️ Fora do raio (${distance}m de ${ACCEPTANCE_RADIUS_METERS}m)`
  };
}

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance
 */
function formatDistance(meters) {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

module.exports = {
  RESTAURANT_LOCATION,
  ACCEPTANCE_RADIUS_METERS,
  calculateDistance,
  verifyLocation,
  formatDistance
};
