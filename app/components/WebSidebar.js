import React, { useEffect, useState } from 'react';
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

const getActiveRouteNameFromState = (state) => {
  if (!state?.routes?.length) return null;
  const currentRoute = state.routes[state.index ?? 0];
  if (!currentRoute) return null;
  if (currentRoute.state) return getActiveRouteNameFromState(currentRoute.state);
  return currentRoute.name ?? null;
};

const resolveCurrentRouteName = (navigation) => {
  const directRoute = navigation?.getCurrentRoute?.();
  if (directRoute?.name) return directRoute.name;
  const state = navigation?.getState?.();
  return getActiveRouteNameFromState(state);
};

const WebSidebar = ({ title, menuStrings, navigation, isRTL }) => {
  if (Platform.OS !== 'web') return null;

  const [hoveredRoute, setHoveredRoute] = useState(null);
  const [activeRoute, setActiveRoute] = useState(() => resolveCurrentRouteName(navigation));

  useEffect(() => {
    const syncActiveRoute = () => setActiveRoute(resolveCurrentRouteName(navigation));
    syncActiveRoute();
    if (!navigation?.addListener) return undefined;

    const unsubscribeState = navigation.addListener('state', syncActiveRoute);
    const unsubscribeFocus = navigation.addListener('focus', syncActiveRoute);

    return () => {
      if (typeof unsubscribeState === 'function') unsubscribeState();
      if (typeof unsubscribeFocus === 'function') unsubscribeFocus();
    };
  }, [navigation]);

  return (
    <View style={[styles.sideMenu, isRTL && styles.sideMenuRtl, Platform.OS === 'web' && styles.sideMenuWeb]}>
      <Text style={[styles.menuTitle, isRTL && styles.rtlText]}>{title}</Text>
      <View style={styles.menuItems}>
        {getMenuItems(menuStrings).map((item) => {
          const isActive = activeRoute === item.route;
          const isHovered = hoveredRoute === item.route;
          const iconColor = isActive
            ? theme.colors.primary
            : isHovered
              ? theme.colors.secondary
              : 'rgba(14, 20, 27, 0.8)';
          const labelColor = isActive
            ? theme.colors.primary
            : isHovered
              ? theme.colors.text
              : 'rgba(14, 20, 27, 0.88)';

          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.menuItem,
                styles.menuItemWeb,
                isRTL && styles.menuItemRtl,
                isActive && styles.menuItemActive,
                !isActive && isHovered && styles.menuItemHover,
                isHovered && (isRTL ? styles.menuItemHoverShiftRtl : styles.menuItemHoverShift),
              ]}
              onMouseEnter={() => setHoveredRoute(item.route)}
              onMouseLeave={() => setHoveredRoute((current) => (current === item.route ? null : current))}
              onPress={() => {
                if (navigation?.isReady?.()) navigation.navigate(item.route);
                else if (navigation?.navigate) navigation.navigate(item.route);
                setActiveRoute(item.route);
              }}
            >
              <Ionicons name={item.icon} size={22} color={iconColor} style={styles.menuIcon} />
              <Text style={[styles.menuLabel, isRTL && styles.rtlText, { color: labelColor }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  },
  menuItemWeb: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'transparent',
    transitionProperty: 'background-color, transform',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease-out',
  },
  menuItemHover: {
    backgroundColor: 'rgba(231, 0, 19, 0.08)',
  },
  menuItemActive: {
    backgroundColor: 'rgba(231, 0, 19, 0.14)',
  },
  menuItemHoverShift: {
    transform: [{ translateX: 2 }],
  },
  menuItemHoverShiftRtl: {
    transform: [{ translateX: -2 }],
  },
  menuItemRtl: {
    flexDirection: 'row-reverse',
  },
  menuIcon: {
    width: 24,
    textAlign: 'center',
    transitionProperty: 'color',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease-out',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    transitionProperty: 'color',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease-out',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default WebSidebar;
