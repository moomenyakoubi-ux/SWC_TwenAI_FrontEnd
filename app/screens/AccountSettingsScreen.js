import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';

const SettingRow = ({ icon, label, description, value, onToggle, isRTL }) => (
  <View style={[styles.settingRow, isRTL && styles.rowReverse]}>
    <View style={[styles.settingIcon, isRTL && styles.settingIconRtl]}>
      <Ionicons name={icon} size={20} color={theme.colors.secondary} />
    </View>
    <View style={styles.settingCopy}>
      <Text style={[styles.settingLabel, isRTL && styles.rtlText]}>{label}</Text>
      {description ? <Text style={[styles.settingDescription, isRTL && styles.rtlText]}>{description}</Text> : null}
    </View>
    <Switch
      trackColor={{ false: '#d1d5db', true: theme.colors.secondary }}
      thumbColor={value ? '#fff' : '#f4f3f4'}
      value={value}
      onValueChange={onToggle}
    />
  </View>
);

const AccountSettingsScreen = () => {
  const { strings, isRTL } = useLanguage();
  const menuStrings = strings.menu;
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationSharing, setLocationSharing] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Navbar
        title={menuStrings.accountSettings}
        isRTL={isRTL}
        onBack={() => navigation.navigate('Home')}
        backLabel={strings.tabs.home}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>Preferenze</Text>
          <SettingRow
            icon="notifications"
            label="Notifiche push"
            description="Aggiornamenti su chat, eventi e nuovi contatti."
            value={notifications}
            onToggle={() => setNotifications((prev) => !prev)}
            isRTL={isRTL}
          />
          <SettingRow
            icon="moon"
            label="Tema scuro"
            description="Riduci l'affaticamento visivo con toni soft."
            value={darkMode}
            onToggle={() => setDarkMode((prev) => !prev)}
            isRTL={isRTL}
          />
          <SettingRow
            icon="navigate"
            label="Condividi posizione"
            description="Migliora i suggerimenti di eventi e luoghi vicini."
            value={locationSharing}
            onToggle={() => setLocationSharing((prev) => !prev)}
            isRTL={isRTL}
          />
          <SettingRow
            icon="mail-open"
            label="Newsletter"
            description="Ricevi riepiloghi settimanali via email."
            value={newsletter}
            onToggle={() => setNewsletter((prev) => !prev)}
            isRTL={isRTL}
          />
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>Sicurezza</Text>
          <TouchableOpacity style={[styles.actionRow, isRTL && styles.rowReverse]}>
            <Ionicons name="key" size={20} color={theme.colors.secondary} />
            <Text style={[styles.actionText, isRTL && styles.rtlText]}>Cambia password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionRow, isRTL && styles.rowReverse]}>
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.secondary} />
            <Text style={[styles.actionText, isRTL && styles.rtlText]}>Verifica in due passaggi</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>Dati e privacy</Text>
          <TouchableOpacity style={[styles.actionRow, isRTL && styles.rowReverse]}>
            <Ionicons name="download" size={20} color={theme.colors.secondary} />
            <Text style={[styles.actionText, isRTL && styles.rtlText]}>Scarica dati personali</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionRow, isRTL && styles.rowReverse]}>
            <Ionicons name="trash" size={20} color={theme.colors.secondary} />
            <Text style={[styles.actionText, isRTL && styles.rtlText]}>Elimina account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadow.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(12,27,51,0.08)',
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
    color: theme.colors.text,
  },
  settingDescription: {
    color: theme.colors.muted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  actionText: {
    color: theme.colors.secondary,
    fontWeight: '600',
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
