/**
 * @typedef {Object} FlightSearchRequest
 * @property {'IT'|'TN'} originCountry
 * @property {string} originIata
 * @property {'IT'|'TN'} destinationCountry
 * @property {string} destinationIata
 * @property {string} departureDate - YYYY-MM-DD
 * @property {string|null|undefined} [returnDate]
 * @property {0|1|2|null|undefined} [maxStops]
 * @property {'price'} sortBy
 * @property {'asc'|'desc'} sortOrder
 * @property {number} adults
 * @property {'EUR'} currency
 */

/**
 * @typedef {Object} FlightSegment
 * @property {string} fromIata
 * @property {string} toIata
 * @property {string} departureTime - ISO datetime
 * @property {string} arrivalTime - ISO datetime
 * @property {string} carrier
 * @property {string} flightNumber
 */

/**
 * @typedef {Object} FlightOffer
 * @property {string} id
 * @property {number} price
 * @property {string} currency
 * @property {string} outboundDate - YYYY-MM-DD
 * @property {string|null|undefined} [returnDate]
 * @property {number} stops
 * @property {number} durationMinutes
 * @property {FlightSegment[]} segments
 */

/**
 * @param {FlightSearchRequest} request
 * @returns {Promise<FlightOffer[]>}
 */
export const searchFlights = async (request) => {
  // Backend hook: replace with API call to /api/flights/search-country
  void request;
  return [];
};
