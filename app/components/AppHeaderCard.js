import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import theme from '../styles/theme';

const AppHeaderCard = ({
  title,
  subtitle,
  leftSlot = null,
  rightSlot = null,
  style,
  contentStyle,
  titleStyle,
  subtitleStyle,
  isRTL = false,
}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isCompact = width < 900;
  const [leftSlotWidth, setLeftSlotWidth] = useState(0);
  const [rightSlotWidth, setRightSlotWidth] = useState(0);
  const sideSlotWidth = Math.max(leftSlotWidth, rightSlotWidth);

  const handleLeftSlotLayout = (event) => {
    const measuredWidth = Math.ceil(event?.nativeEvent?.layout?.width || 0);
    if (measuredWidth !== leftSlotWidth) {
      setLeftSlotWidth(measuredWidth);
    }
  };

  const handleRightSlotLayout = (event) => {
    const measuredWidth = Math.ceil(event?.nativeEvent?.layout?.width || 0);
    if (measuredWidth !== rightSlotWidth) {
      setRightSlotWidth(measuredWidth);
    }
  };

  const webGradientStyle = isWeb
    ? { backgroundImage: 'linear-gradient(135deg, #E60023 0%, #FF3B3B 100%)' }
    : null;

  const webShadowStyle = isWeb ? { boxShadow: '0 10px 24px rgba(0,0,0,0.12)' } : null;

  return (
    <View style={[styles.wrapper, isCompact && styles.wrapperCompact, style]}>
      <View
        style={[
          styles.card,
          isCompact && styles.cardCompact,
          webGradientStyle,
          webShadowStyle,
          contentStyle,
        ]}
      >
        <View onLayout={handleLeftSlotLayout} style={[styles.sideSlot, { width: sideSlotWidth }]}>
          {leftSlot}
        </View>
        <View style={styles.textBlock}>
          <Text numberOfLines={1} style={[styles.title, isRTL && styles.rtlText, titleStyle]}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={2} style={[styles.subtitle, isRTL && styles.rtlText, subtitleStyle]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View onLayout={handleRightSlotLayout} style={[styles.sideSlot, { width: sideSlotWidth }]}>
          {rightSlot}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 18,
    marginBottom: 18,
  },
  wrapperCompact: {
    marginTop: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 22,
    backgroundColor: theme.colors.secondary,
    paddingVertical: 18,
    paddingHorizontal: 22,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardCompact: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  sideSlot: {
    minHeight: 40,
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  title: {
    color: theme.colors.card,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
  },
  rtlText: {
    writingDirection: 'rtl',
  },
});

export default AppHeaderCard;
