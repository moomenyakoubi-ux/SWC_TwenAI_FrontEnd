import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import theme from '../styles/theme';

const COLLAPSED_TAB_BAR_WIDTH = 88;
const EXPANDED_TAB_BAR_WIDTH = 244;
const ANIMATION_DURATION = 220;

export const WEB_TAB_BAR_WIDTH = COLLAPSED_TAB_BAR_WIDTH;

const WebTabBar = ({ state, descriptors, navigation }) => {
  if (Platform.OS !== 'web') return null;

  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredRouteKey, setHoveredRouteKey] = useState(null);
  const widthAnim = useRef(new Animated.Value(COLLAPSED_TAB_BAR_WIDTH)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: isExpanded ? EXPANDED_TAB_BAR_WIDTH : COLLAPSED_TAB_BAR_WIDTH,
        duration: ANIMATION_DURATION,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: isExpanded ? 1 : 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isExpanded, labelOpacity, widthAnim]);

  const labelWidth = widthAnim.interpolate({
    inputRange: [COLLAPSED_TAB_BAR_WIDTH, EXPANDED_TAB_BAR_WIDTH],
    outputRange: [0, 136],
    extrapolate: 'clamp',
  });

  const labelGap = widthAnim.interpolate({
    inputRange: [COLLAPSED_TAB_BAR_WIDTH, EXPANDED_TAB_BAR_WIDTH],
    outputRange: [0, theme.spacing.md],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[styles.container, { width: widthAnim }]}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setHoveredRouteKey(null);
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isHidden =
          options?.tabBarStyle?.display === 'none' || options?.tabBarItemStyle?.display === 'none';

        if (isHidden) {
          return null;
        }

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;
        const labelText = typeof label === 'string' ? label : route.name;

        const isFocused = state.index === index;
        const isHovered = hoveredRouteKey === route.key;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const icon =
          typeof options.tabBarIcon === 'function'
            ? options.tabBarIcon({
                focused: isFocused,
                size: 22,
                color: isFocused ? theme.colors.card : isHovered ? theme.colors.primary : theme.colors.secondary,
              })
            : null;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onMouseEnter={() => setHoveredRouteKey(route.key)}
            onMouseLeave={() => setHoveredRouteKey((current) => (current === route.key ? null : current))}
            style={[
              styles.item,
              isExpanded ? styles.itemExpanded : styles.itemCollapsed,
              isFocused && styles.itemActive,
              !isFocused && isHovered && styles.itemHovered,
            ]}
          >
            {icon}
            <Animated.View style={[styles.labelWrap, { width: labelWidth, marginLeft: labelGap, opacity: labelOpacity }]}>
              <Text style={[styles.label, isFocused && styles.labelActive, !isFocused && isHovered && styles.labelHovered]} numberOfLines={1}>
                {labelText}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRightWidth: 1,
    borderRightColor: 'rgba(12,27,51,0.08)',
    gap: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-start',
    ...theme.shadow.card,
    zIndex: 30,
  },
  item: {
    width: '100%',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  itemCollapsed: {
    justifyContent: 'center',
  },
  itemExpanded: {
    justifyContent: 'flex-start',
  },
  itemActive: {
    backgroundColor: theme.colors.secondary,
  },
  itemHovered: {
    backgroundColor: 'rgba(231, 0, 19, 0.10)',
  },
  labelWrap: {
    overflow: 'hidden',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'left',
  },
  labelHovered: {
    color: theme.colors.primary,
  },
  labelActive: {
    color: theme.colors.card,
  },
});

export default WebTabBar;
