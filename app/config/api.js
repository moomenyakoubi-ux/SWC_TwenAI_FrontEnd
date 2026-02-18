import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

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
    const accessToken = await getSupabaseAccessToken();
    if (!accessToken) {
      console.log('[api] health check skipped: missing access token.');
      return;
    }
    const response = await fetch(healthUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
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

export const getSupabaseAccessToken = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      if (__DEV__) {
        console.warn('[api] getSession error:', error.message || error);
      }
      return null;
    }
    return data?.session?.access_token || null;
  } catch (error) {
    if (__DEV__) {
      console.warn('[api] getSession failed:', error?.message || error);
    }
    return null;
  }
};
