import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import { signOut } from '../auth/authApi';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';
import { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';
import useSession from '../auth/useSession';

const SettingRow = ({ icon, label, description, value, onToggle, isRTL, styles, appTheme }) => (
  <View style={[styles.settingRow, isRTL && styles.rowReverse]}>
    <View style={[styles.settingIcon, isRTL && styles.settingIconRtl]}>
      <Ionicons name={icon} size={20} color={appTheme.colors.secondary} />
    </View>
    <View style={styles.settingCopy}>
      <Text style={[styles.settingLabel, isRTL && styles.rtlText]}>{label}</Text>
      {description ? <Text style={[styles.settingDescription, isRTL && styles.rtlText]}>{description}</Text> : null}
    </View>
    <Switch
      trackColor={{ false: appTheme.colors.switchTrackOff, true: appTheme.colors.secondary }}
      thumbColor={value ? '#fff' : '#f4f3f4'}
      value={value}
      onValueChange={onToggle}
    />
  </View>
);

const AccountSettingsScreen = () => {
  const { strings, isRTL } = useLanguage();
  const { theme: appTheme, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const isWeb = Platform.OS === 'web';
  const menuStrings = strings.menu;
  const navigation = useNavigation();
  const { user } = useSession();
  const [notifications, setNotifications] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      const options = isWeb ? { scope: 'local' } : undefined;
      const { error } = await signOut(options);
      if (error) {
        if (!isWeb) {
          Alert.alert('Errore', error.message);
        }
      }
      if (isWeb && typeof window !== 'undefined') {
        const storageKey = supabase?.auth?.storageKey;
        if (storageKey) {
          await AsyncStorage.removeItem(storageKey);
        }
        window.location.reload();
      }
    } catch (err) {
      Alert.alert('Errore', err?.message || 'Logout fallito.');
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.webSafeArea]}>
      <Navbar
        title={menuStrings.accountSettings}
        isRTL={isRTL}
        onBack={() => navigation.navigate('Home')}
        backLabel={strings.tabs.home}
      />
      <ScrollView
        contentContainerStyle={[styles.content, isWeb && styles.webContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>Preferenze</Text>
          <SettingRow
            icon="notifications"
            label="Notifiche push"
            description="Aggiornamenti su chat, eventi e nuovi contatti."
            value={notifications}
            onToggle={() => setNotifications((prev) => !prev)}
            isRTL={isRTL}
            styles={styles}
            appTheme={appTheme}
          />
          <SettingRow
            icon="moon"
            label="Tema scuro"
            description="Riduci l'affaticamento visivo con toni soft."
            value={isDark}
            onToggle={toggleTheme}
            isRTL={isRTL}
            styles={styles}
            appTheme={appTheme}
          />
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>Sicurezza</Text>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>Email</Text>
            <Text style={[styles.fieldValue, isRTL && styles.rtlText]}>{user?.email || '-'}</Text>
          </View>
          <TouchableOpacity style={[styles.actionRow, isRTL && styles.rowReverse]}>
            <Ionicons name="key" size={20} color={appTheme.colors.secondary} />
            <Text style={[styles.actionText, isRTL && styles.rtlText]}>Cambia password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionRow, isRTL && styles.rowReverse]}>
            <Ionicons name="shield-checkmark" size={20} color={appTheme.colors.secondary} />
            <Text style={[styles.actionText, isRTL && styles.rtlText]}>Verifica in due passaggi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.logoutRow,
              isWeb && styles.logoutRowWeb,
              logoutLoading && styles.logoutDisabled,
              isRTL && styles.rowReverse,
            ]}
            onPress={handleLogout}
            disabled={logoutLoading}
          >
            <Ionicons name="log-out-outline" size={20} color={appTheme.colors.card} />
            <Text style={[styles.logoutText, isWeb && styles.logoutTextWeb, isRTL && styles.rtlText]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>Dati e privacy</Text>
          <TouchableOpacity style={[styles.actionRow, isRTL && styles.rowReverse]}>
            <Ionicons name="trash" size={20} color={appTheme.colors.secondary} />
            <Text style={[styles.actionText, isRTL && styles.rtlText]}>Elimina account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (appTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: appTheme.colors.background,
    },
    webSafeArea: {
      paddingLeft: WEB_TAB_BAR_WIDTH,
    },
    content: {
      padding: appTheme.spacing.lg,
      gap: appTheme.spacing.md,
    },
    webContent: {
      paddingLeft: appTheme.spacing.xl,
      paddingRight: appTheme.spacing.xl + WEB_SIDE_MENU_WIDTH,
      width: '100%',
      maxWidth: 1100,
      alignSelf: 'center',
    },
    card: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      padding: appTheme.spacing.lg,
      gap: appTheme.spacing.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      ...appTheme.shadow.card,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: appTheme.colors.text,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appTheme.spacing.md,
    },
    settingIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: appTheme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingCopy: {
      flex: 1,
      gap: 4,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: appTheme.colors.text,
    },
    settingDescription: {
      color: appTheme.colors.muted,
    },
    fieldRow: {
      gap: 4,
    },
    fieldLabel: {
      color: appTheme.colors.muted,
      fontWeight: '700',
    },
    fieldValue: {
      color: appTheme.colors.text,
      fontWeight: '600',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appTheme.spacing.sm,
      paddingVertical: 4,
    },
    actionText: {
      color: appTheme.colors.secondary,
      fontWeight: '600',
    },
    logoutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appTheme.spacing.sm,
      paddingVertical: 10,
      paddingHorizontal: appTheme.spacing.lg,
      borderRadius: appTheme.radius.md,
      backgroundColor: appTheme.colors.primary,
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    logoutRowWeb: {
      backgroundColor: appTheme.colors.primary,
      borderWidth: 0,
      borderColor: 'transparent',
      boxShadow: '0 10px 24px rgba(215,35,35,0.2)',
      cursor: 'pointer',
      minWidth: 160,
      maxWidth: 200,
    },
    logoutText: {
      color: appTheme.colors.card,
      fontWeight: '700',
    },
    logoutTextWeb: {
      color: appTheme.colors.card,
      fontSize: 16,
      letterSpacing: 0.4,
    },
    logoutDisabled: {
      opacity: 0.7,
    },
    rowReverse: {
      flexDirection: 'row-reverse',
    },
    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    settingIconRtl: {
      transform: [{ scaleX: -1 }],
    },
  });

export default AccountSettingsScreen;
