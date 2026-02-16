import React, { useState } from 'react';
import { Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import theme from '../styles/theme';
import { WEB_SIDE_MENU_WIDTH } from './WebSidebar';
import { WEB_TAB_BAR_WIDTH } from './WebTabBar';

const HEADER_HEIGHT = 72;
const HEADER_RADIUS = 24;

const AppHeader = ({ title, rightSlot = null, isRTL = false }) => {
  const isWeb = Platform.OS === 'web';
  const [rightSlotWidth, setRightSlotWidth] = useState(0);
  const webGradientStyle = isWeb
    ? { backgroundImage: 'linear-gradient(180deg, #F41828 0%, #E70013 62%, #C90010 100%)' }
    : null;

  const handleRightSlotLayout = (event) => {
    const measuredWidth = Math.ceil(event?.nativeEvent?.layout?.width || 0);
    if (measuredWidth !== rightSlotWidth) {
      setRightSlotWidth(measuredWidth);
    }
  };

  return (
    <View style={[styles.safeArea, isWeb && styles.safeAreaWeb]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.container, isWeb && styles.webContainer, webGradientStyle]}>
        <View style={[styles.sideSlot, { width: rightSlotWidth }]} />
        <Text numberOfLines={1} style={[styles.title, isRTL && styles.rtlText]}>
          {title}
        </Text>
        <View onLayout={handleRightSlotLayout} style={styles.sideSlot}>
          {rightSlot}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.secondary,
    paddingTop: Platform.OS === 'android' ? theme.spacing.sm : 0,
  },
  safeAreaWeb: {
    paddingTop: 0,
  },
  container: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
    backgroundColor: theme.colors.secondary,
    shadowColor: '#0C1B33',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  webContainer: {
    paddingLeft: theme.spacing.lg + WEB_TAB_BAR_WIDTH,
    paddingRight: theme.spacing.lg + WEB_SIDE_MENU_WIDTH,
  },
  sideSlot: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
    color: theme.colors.card,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  rtlText: {
    writingDirection: 'rtl',
  },
});

export default AppHeader;
