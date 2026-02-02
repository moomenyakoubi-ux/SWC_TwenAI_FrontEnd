import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

export const WEB_SIDE_MENU_WIDTH = 380;

const getMenuItems = (menuStrings) => [
  { label: menuStrings.addContact, icon: 'person-add', route: 'AddContact' },
  { label: menuStrings.accountSettings, icon: 'settings', route: 'AccountSettings' },
  { label: menuStrings.language, icon: 'globe', route: 'Lingua' },
  { label: menuStrings.privacy, icon: 'shield-checkmark', route: 'PrivacyPolicy' },
  { label: menuStrings.terms, icon: 'document-text', route: 'Termini' },
  { label: menuStrings.copyright, icon: 'ribbon', route: 'Copyright' },
  { label: menuStrings.cookies, icon: 'ice-cream', route: 'CookiePolicy' },
  { label: menuStrings.aiUsage, icon: 'sparkles', route: 'AiUsage' },
  { label: menuStrings.support, icon: 'call', route: 'Support' },
];

const WebSidebar = ({ title, menuStrings, navigation, isRTL }) => {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={[styles.sideMenu, isRTL && styles.sideMenuRtl, Platform.OS === 'web' && styles.sideMenuWeb]}>
      <Text style={[styles.menuTitle, isRTL && styles.rtlText]}>{title}</Text>
      <View style={styles.menuItems}>
        {getMenuItems(menuStrings).map((item) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.menuItem, isRTL && styles.menuItemRtl]}
            onPress={() => {
              if (navigation?.isReady?.()) navigation.navigate(item.route);
            }}
          >
            <Ionicons name={item.icon} size={22} color={theme.colors.secondary} />
            <Text style={[styles.menuLabel, isRTL && styles.rtlText]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: WEB_SIDE_MENU_WIDTH,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl + theme.spacing.sm,
    backgroundColor: theme.colors.card,
    ...theme.shadow.card,
    gap: theme.spacing.lg,
  },
  sideMenuWeb: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    height: '100vh',
    zIndex: 9999,
  },
  sideMenuRtl: {
    alignItems: 'flex-end',
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: Platform.OS === 'android' ? theme.spacing.sm : 0,
  },
  menuItems: {
    gap: theme.spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  menuItemRtl: {
    flexDirection: 'row-reverse',
  },
  menuLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default WebSidebar;
