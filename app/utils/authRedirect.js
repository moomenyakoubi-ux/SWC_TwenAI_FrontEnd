import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

const UPDATE_PASSWORD_PATH = 'auth/update-password';
const UPDATE_PASSWORD_WEB_PATH = '/auth/update-password';

// Supabase richiede redirectTo assoluto su web, altrimenti interpreta il path come relativo a *.supabase.co.
export const buildResetRedirectUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${UPDATE_PASSWORD_WEB_PATH}`;
  }

  return Linking.createURL(UPDATE_PASSWORD_PATH);
};

export const isUpdatePasswordLink = (url) => {
  if (!url) return false;

  try {
    const parsed = Linking.parse(url);
    if (parsed?.path) {
      const normalizedPath = parsed.path.replace(/^\/+/, '');
      return normalizedPath === UPDATE_PASSWORD_PATH;
    }
  } catch (error) {
    // Fall through to a simple substring check.
  }

  return url.includes(UPDATE_PASSWORD_PATH);
};
