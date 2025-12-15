import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import theme from '../styles/theme';

export const WEB_TAB_BAR_WIDTH = 112;

const WebTabBar = ({ state, descriptors, navigation }) => {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.container}>
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

        const isFocused = state.index === index;
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
                color: isFocused ? theme.colors.card : theme.colors.secondary,
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
            style={[styles.item, isFocused && styles.itemActive]}
          >
            {icon}
            <Text style={[styles.label, isFocused && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: WEB_TAB_BAR_WIDTH,
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
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.md,
    gap: theme.spacing.xs,
  },
  itemActive: {
    backgroundColor: theme.colors.secondary,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.secondary,
    textAlign: 'center',
  },
  labelActive: {
    color: theme.colors.card,
  },
});

export default WebTabBar;
