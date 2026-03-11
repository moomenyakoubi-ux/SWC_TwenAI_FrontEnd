// app/services/pushNotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

// Configurazione handler notifiche
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Richiedi permessi per le notifiche push
 */
export async function registerForPushNotificationsAsync() {
  let token = null;

  if (!Device.isDevice) {
    console.log('[Push] Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted!');
    return null;
  }

  // Ottieni token Expo
  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId || 'aac8a5f4-a5f1-4c24-ad18-7ec90d83ce7a'
    })).data;

    console.log('[Push] Expo Push Token:', token);
  } catch (error) {
    console.error('[Push] Error getting push token:', error);
    return null;
  }

  // Configurazione specifica per Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0066CC',
    });
  }

  return token;
}

/**
 * Registra token sul backend
 */
export async function registerPushToken(token) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.log('[Push] No session available');
      return false;
    }

    const response = await fetch(`${API_BASE}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        expoPushToken: token,
        platform: Platform.OS,
        deviceId: Constants.deviceId,
        appVersion: Constants.expoConfig?.version
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Salva token in AsyncStorage per rimuoverlo al logout
    await AsyncStorage.setItem('expoPushToken', token);
    console.log('[Push] Token registered successfully');
    return true;
  } catch (error) {
    console.error('[Push] Failed to register token:', error);
    return false;
  }
}

/**
 * Rimuovi token dal backend (logout)
 */
export async function unregisterPushToken() {
  try {
    const token = await AsyncStorage.getItem('expoPushToken');
    if (!token) return true;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      await AsyncStorage.removeItem('expoPushToken');
      return true;
    }

    const response = await fetch(`${API_BASE}/api/push/unregister`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ expoPushToken: token })
    });

    await AsyncStorage.removeItem('expoPushToken');
    console.log('[Push] Token unregistered successfully');
    return true;
  } catch (error) {
    console.error('[Push] Failed to unregister token:', error);
    return false;
  }
}

/**
 * Setup listener per notifiche in arrivo
 */
export function setupNotificationListeners(navigationRef) {
  // Notifica ricevuta mentre app è in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    notification => {
      console.log('[Push] Notification received in foreground:', notification);
      // Aggiorna badge o stato se necessario
    }
  );

  // Utente ha toccato la notifica
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    response => {
      const data = response.notification.request.content.data;
      console.log('[Push] Notification tapped:', data);

      // Navigazione basata sul tipo di notifica
      if (data && navigationRef?.current) {
        handleNotificationNavigation(navigationRef.current, data);
      }
    }
  );

  // Cleanup function
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Gestisci navigazione quando utente tocca notifica
 */
function handleNotificationNavigation(navigation, data) {
  // Piccolo delay per assicurarsi che la navigazione sia pronta
  setTimeout(() => {
    switch (data.type) {
      case 'message':
        navigation.navigate('Chat', { 
          conversationId: data.conversationId 
        });
        break;
        
      case 'like':
      case 'comment':
        // Naviga al profilo di chi ha interagito
        if (data.actorId) {
          navigation.navigate('PublicProfile', { 
            profileId: data.actorId 
          });
        }
        break;
        
      case 'follow':
        if (data.followerId) {
          navigation.navigate('PublicProfile', { 
            profileId: data.followerId 
          });
        }
        break;
        
      default:
        console.log('[Push] Unknown notification type:', data.type);
    }
  }, 500);
}

/**
 * Ottieni preferenze notifiche dal backend
 */
export async function getNotificationPreferences() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const response = await fetch(`${API_BASE}/api/push/preferences`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error('[Push] Failed to get preferences:', error);
    return null;
  }
}

/**
 * Aggiorna preferenze notifiche
 */
export async function updateNotificationPreferences(preferences) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    const response = await fetch(`${API_BASE}/api/push/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(preferences)
    });

    return response.ok;
  } catch (error) {
    console.error('[Push] Failed to update preferences:', error);
    return false;
  }
}
