import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

const MENU_WIDTH = 320;
const ANIMATION_DURATION = 350;

const getMenuItems = (menuStrings) => [
  { label: menuStrings.addContact, icon: 'person-add', route: 'AddContact' },
  { label: menuStrings.accountSettings, icon: 'settings', route: 'AccountSettings' },
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

const WebSidebar = ({ menuStrings, navigation, isRTL }) => {
  if (Platform.OS !== 'web') return null;

  const { theme: appTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredRoute, setHoveredRoute] = useState(null);
  const [pressedRoute, setPressedRoute] = useState(null);
  const [activeRoute, setActiveRoute] = useState(() => resolveCurrentRouteName(navigation));

  // Animation values
  const slideAnim = useMemo(() => new Animated.Value(MENU_WIDTH), []);
  const backdropOpacity = useMemo(() => new Animated.Value(0), []);
  
  // Hamburger morphing animation values
  const topLineAnim = useMemo(() => new Animated.Value(0), []);
  const middleLineAnim = useMemo(() => new Animated.Value(1), []);
  const bottomLineAnim = useMemo(() => new Animated.Value(0), []);
  const buttonRotation = useMemo(() => new Animated.Value(0), []);
  const buttonScale = useMemo(() => new Animated.Value(1), []);

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

  useEffect(() => {
    // Menu slide animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : MENU_WIDTH,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      // Hamburger morphing to X
      Animated.timing(topLineAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(middleLineAnim, {
        toValue: isOpen ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bottomLineAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(buttonRotation, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, slideAnim, backdropOpacity, topLineAnim, middleLineAnim, bottomLineAnim, buttonRotation]);

  const handleMenuPress = useCallback(() => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    setIsOpen(!isOpen);
  }, [isOpen, buttonScale]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleMenuItemPress = useCallback((route) => {
    if (navigation?.isReady?.()) navigation.navigate(route);
    else if (navigation?.navigate) navigation.navigate(route);
    setActiveRoute(route);
    setIsOpen(false);
  }, [navigation]);

  // Interpolations for hamburger morphing
  const topLineTranslateY = topLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 7],
  });
  const topLineRotation = topLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });
  const bottomLineTranslateY = bottomLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });
  const bottomLineRotation = bottomLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-45deg'],
  });
  const buttonRotate = buttonRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  


  return (
    <>
      {/* Morphing Hamburger Button - Fixed Top Right ALWAYS */}
      <Animated.View
        style={[
          styles.hamburgerContainer,
          { 
            transform: [
              { scale: buttonScale },
              { rotate: buttonRotate }
            ] 
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.hamburgerButton,
            isOpen && styles.hamburgerButtonActive
          ]}
          onPress={handleMenuPress}
          activeOpacity={0.8}
          onMouseEnter={() => {
            Animated.timing(buttonScale, {
              toValue: 1.08,
              duration: 150,
              useNativeDriver: true,
            }).start();
          }}
          onMouseLeave={() => {
            Animated.timing(buttonScale, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }).start();
          }}
        >
          <View style={styles.hamburgerIcon}>
            <Animated.View 
              style={[
                styles.hamburgerLine, 
                { 
                  backgroundColor: isOpen ? appTheme.colors.primary : appTheme.colors.card,
                  transform: [
                    { translateY: topLineTranslateY },
                    { rotate: topLineRotation }
                  ]
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.hamburgerLine, 
                { 
                  backgroundColor: isOpen ? appTheme.colors.primary : appTheme.colors.card,
                  opacity: middleLineAnim,
                  transform: [{ scaleX: middleLineAnim }]
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.hamburgerLine, 
                { 
                  backgroundColor: isOpen ? appTheme.colors.primary : appTheme.colors.card,
                  transform: [
                    { translateY: bottomLineTranslateY },
                    { rotate: bottomLineRotation }
                  ]
                }
              ]} 
            />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Backdrop */}
      {isOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={[
              styles.backdropOverlay,
              { opacity: backdropOpacity },
            ]}
          />
        </TouchableOpacity>
      )}

      {/* Morphing Slide-out Menu - ALWAYS on the right */}
      <Animated.View
        style={[
          styles.sideMenu,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Menu Header - Solo bottone chiusura */}
        <View style={styles.menuHeader}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={appTheme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Menu Items - Animated like WebTabBar */}
        <View style={styles.menuItems}>
          {getMenuItems(menuStrings).map((item, index) => {
            const isActive = activeRoute === item.route;
            const isHovered = hoveredRoute === item.route;
            const isPressed = pressedRoute === item.route;
            
            const iconColor = isActive
              ? appTheme.colors.card
              : isHovered
                ? appTheme.colors.primary
                : appTheme.colors.secondary;
            const labelColor = isActive
              ? appTheme.colors.card
              : isHovered
                ? appTheme.colors.primary
                : appTheme.colors.text;
            const bgColor = isActive
              ? appTheme.colors.secondary
              : isHovered
                ? 'rgba(231, 0, 19, 0.10)'
                : 'transparent';

            return (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.menuItem,
                  styles.menuItemWeb,
                  isRTL && styles.menuItemRtl,
                  isActive && styles.menuItemActive,
                  !isActive && isHovered && styles.menuItemHover,
                  isPressed && styles.menuItemPressed,
                ]}
                onMouseEnter={() => setHoveredRoute(item.route)}
                onMouseLeave={() => setHoveredRoute((current) => (current === item.route ? null : current))}
                onPressIn={() => setPressedRoute(item.route)}
                onPressOut={() => setPressedRoute((current) => (current === item.route ? null : current))}
                onPress={() => handleMenuItemPress(item.route)}
              >
                <Animated.View style={[
                  styles.iconContainer,
                  { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : appTheme.colors.background }
                ]}>
                  <Ionicons name={item.icon} size={22} color={iconColor} />
                </Animated.View>
                <Text style={[styles.menuLabel, isRTL && styles.rtlText, { color: labelColor }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.menuFooter}>
          <Text style={[styles.footerText, isRTL && styles.rtlText]}>
            Darna
          </Text>
        </View>
      </Animated.View>
    </>
  );
};

const createStyles = (appTheme) =>
  StyleSheet.create({
    // Hamburger Button Styles - Morphing
    hamburgerContainer: {
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 10001,
    },

    hamburgerButton: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: appTheme.colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      ...appTheme.shadow.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
      transitionProperty: 'background-color, box-shadow',
      transitionDuration: '300ms',
      transitionTimingFunction: 'ease-out',
    },
    hamburgerButtonActive: {
      backgroundColor: appTheme.colors.card,
      shadowColor: appTheme.colors.primary,
      shadowOpacity: 0.3,
    },
    hamburgerIcon: {
      width: 24,
      height: 20,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    hamburgerLine: {
      width: 24,
      height: 3,
      borderRadius: 2,
      transitionProperty: 'background-color',
      transitionDuration: '300ms',
    },

    // Backdrop Styles
    backdrop: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9998,
    },
    backdropOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },

    // Menu Styles
    sideMenu: {
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: MENU_WIDTH,
      backgroundColor: appTheme.colors.card,
      zIndex: 9999,
      ...appTheme.shadow.card,
      shadowColor: '#000',
      shadowOffset: { width: -8, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 30,
      elevation: 15,
    },


    // Menu Header
    menuHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: appTheme.spacing.lg,
      paddingTop: 24,
      paddingBottom: appTheme.spacing.md,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: appTheme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      transitionProperty: 'background-color, transform',
      transitionDuration: '200ms',
    },

    // Menu Items - Stile WebTabBar
    menuItems: {
      flex: 1,
      paddingHorizontal: appTheme.spacing.md,
      paddingTop: appTheme.spacing.lg,
      gap: appTheme.spacing.sm,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appTheme.spacing.md,
      width: '100%',
      paddingVertical: appTheme.spacing.sm,
      paddingHorizontal: appTheme.spacing.md,
      borderRadius: appTheme.radius.md,
      minHeight: 56,
    },
    menuItemRtl: {
      flexDirection: 'row-reverse',
    },
    menuItemWeb: {
      transitionProperty: 'background-color, transform, opacity',
      transitionDuration: '200ms',
      transitionTimingFunction: 'ease-out',
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    menuItemHover: {
      backgroundColor: 'rgba(231, 0, 19, 0.10)',
      transform: [{ scale: 1.03 }],
    },
    menuItemPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.92,
    },
    menuItemActive: {
      backgroundColor: appTheme.colors.secondary,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      transitionProperty: 'color',
      transitionDuration: '200ms',
    },

    // Menu Footer
    menuFooter: {
      paddingHorizontal: appTheme.spacing.lg,
      paddingVertical: appTheme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: appTheme.colors.divider,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 14,
      fontWeight: '700',
      color: appTheme.colors.muted,
      letterSpacing: 1,
    },

    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
  });

export default WebSidebar;
