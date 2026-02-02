import { Platform } from 'react-native';

let hasLoggedHealthCheck = false;

export const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    console.error('[api] EXPO_PUBLIC_API_BASE_URL is not set; no safe fallback for web.');
    return '';
  }
  console.error('[api] EXPO_PUBLIC_API_BASE_URL is not set; API calls will fail on native.');
  return '';
};

export const logHealthCheck = async () => {
  if (!__DEV__ || hasLoggedHealthCheck) return;
  hasLoggedHealthCheck = true;
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    console.log('[api] API_BASE_URL missing; skip health check.');
    return;
  }
  const healthUrl = `${baseUrl}/api/health`;
  console.log('[api] API_BASE_URL', baseUrl);
  console.log('[api] health check URL', healthUrl);
  try {
    const response = await fetch(healthUrl);
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    console.log('[api] health check status', response.status);
    console.log('[api] health check body', body);
  } catch (error) {
    console.log('[api] health check failed', error?.message || error);
  }
};

export const API_BASE = getApiBaseUrl();
