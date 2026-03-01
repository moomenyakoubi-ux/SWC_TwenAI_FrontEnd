import React, { useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

const DEFAULT_ASPECT_RATIO = 16 / 9;
const WEB_CARD_MAX_WIDTH_PX = 880;
const WEB_DEFAULT_TARGET_MAX_MEDIA_WIDTH_PX = 700;
const WEB_PORTRAIT_TARGET_MAX_MEDIA_WIDTH_PX = 760;
const WEB_DEFAULT_MAX_MEDIA_HEIGHT_PX = 560;
const WEB_PORTRAIT_MAX_MEDIA_HEIGHT_PX = 640;
const WEB_MAX_MEDIA_VH = 0.6;
const WEB_MEDIA_VIEWPORT_SHARE = 0.72;
const PORTRAIT_ASPECT_RATIO_THRESHOLD = 0.9;

const toFinitePositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const ResponsiveMedia = ({ uri, aspectRatio, borderRadius = 0 }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const isWeb = Platform.OS === 'web';

  const safeAspectRatio = toFinitePositiveNumber(aspectRatio) || DEFAULT_ASPECT_RATIO;

  const sizing = useMemo(() => {
    if (!isWeb) {
      return {
        computedHeight: null,
        maxHeight: null,
        finalWidth: null,
        finalHeight: null,
      };
    }

    const safeWindowWidth = Math.max(320, Number(windowWidth) || 320);
    const safeWindowHeight = Math.max(320, Number(windowHeight) || 320);
    const isPortrait = safeAspectRatio < PORTRAIT_ASPECT_RATIO_THRESHOLD;
    const targetMaxMediaWidth = isPortrait
      ? WEB_PORTRAIT_TARGET_MAX_MEDIA_WIDTH_PX
      : WEB_DEFAULT_TARGET_MAX_MEDIA_WIDTH_PX;
    const maxHeightLimit = isPortrait
      ? WEB_PORTRAIT_MAX_MEDIA_HEIGHT_PX
      : WEB_DEFAULT_MAX_MEDIA_HEIGHT_PX;
    const maxHeight = Math.min(maxHeightLimit, safeWindowHeight * WEB_MAX_MEDIA_VH);

    const availableWidth = containerWidth > 0
      ? containerWidth
      : Math.min(WEB_CARD_MAX_WIDTH_PX, safeWindowWidth * WEB_MEDIA_VIEWPORT_SHARE);
    const desiredWidth = Math.min(
      targetMaxMediaWidth,
      safeWindowWidth * WEB_MEDIA_VIEWPORT_SHARE,
      WEB_CARD_MAX_WIDTH_PX,
      availableWidth,
    );
    const computedHeight = desiredWidth / safeAspectRatio;

    const shouldClampHeight = computedHeight > maxHeight;
    const finalHeight = shouldClampHeight ? maxHeight : computedHeight;
    const unclampedFinalWidth = shouldClampHeight
      ? Math.floor(maxHeight * safeAspectRatio)
      : desiredWidth;
    const finalWidth = Math.max(1, Math.min(desiredWidth, unclampedFinalWidth));

    return {
      computedHeight,
      maxHeight,
      finalWidth,
      finalHeight,
    };
  }, [containerWidth, isWeb, safeAspectRatio, windowHeight, windowWidth]);

  const wrapperStyle = useMemo(() => {
    if (!isWeb) {
      return {
        width: '100%',
        aspectRatio: safeAspectRatio,
        borderRadius,
      };
    }

    return {
      width: sizing.finalWidth ?? '100%',
      height: sizing.finalHeight ?? sizing.maxHeight,
      maxWidth: '100%',
      alignSelf: 'center',
      overflow: 'hidden',
      borderRadius,
    };
  }, [borderRadius, isWeb, safeAspectRatio, sizing.finalHeight, sizing.finalWidth, sizing.maxHeight]);

  if (!uri) return null;

  return (
    <View
      style={[styles.wrapper, wrapperStyle]}
      onLayout={(event) => {
        const rawWidth = Number(event?.nativeEvent?.layout?.width) || 0;
        const nextWidth = rawWidth > 0 ? rawWidth : 0;
        setContainerWidth((prev) => (Math.abs(prev - nextWidth) < 0.5 ? prev : nextWidth));
      }}
    >
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default ResponsiveMedia;
