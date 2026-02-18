import { getApiBaseUrl, getSupabaseAccessToken } from '../config/api';

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
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('Flight search failed: EXPO_PUBLIC_API_BASE_URL is not set.');
  }
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) {
    const authError = new Error('Flight search requires an authenticated session.');
    authError.code = 'AUTH_REQUIRED';
    throw authError;
  }

  const response = await fetch(`${baseUrl}/api/flights/search-country`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let details = '';

    try {
      if (contentType.includes('application/json')) {
        const errorJson = await response.json();
        details = errorJson?.message || errorJson?.error || JSON.stringify(errorJson);
      } else {
        details = await response.text();
      }
    } catch (_parseError) {
      details = '';
    }

    const statusInfo = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    const errorMessage = details
      ? `Flight search failed (${statusInfo}): ${details}`
      : `Flight search failed (${statusInfo}).`;
    throw new Error(errorMessage);
  }

  const json = await response.json();
  const offers = Array.isArray(json?.offers) ? json.offers : [];
  if (json?.queryHash) {
    Object.defineProperty(offers, 'queryHash', {
      value: json.queryHash,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }
  return offers;
};
