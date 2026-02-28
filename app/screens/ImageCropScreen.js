import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  PanResponder,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';
import {
  clamp,
  clampTranslationToFrame,
  computeCropRect,
} from '../utils/imageCrop';
import { processPostImageForUpload } from '../utils/postImageProcessing';

const RATIO_OPTIONS = [
  { key: '1:1', value: 1 },
  { key: '4:5', value: 4 / 5 },
];
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ACTION_BAR_HEIGHT = 88;
const WEB_MAX_FRAME_WIDTH = 520;
const WEB_ROOT_TOP_PADDING = 16;

const readImageSize = async (uri, fallbackWidth, fallbackHeight) => {
  const width = Number(fallbackWidth);
  const height = Number(fallbackHeight);
  if (width > 0 && height > 0) {
    return { width, height };
  }

  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (resolvedWidth, resolvedHeight) =>
        resolve({
          width: Math.max(1, resolvedWidth || 1),
          height: Math.max(1, resolvedHeight || 1),
        }),
      () =>
        resolve({
          width: Math.max(1, width || 1),
          height: Math.max(1, height || 1),
        }),
    );
  });
};

const ZoomSlider = ({ value, onChange, minimum = MIN_ZOOM, maximum = MAX_ZOOM, theme }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [trackWidth, setTrackWidth] = useState(1);

  const valueToPercent = useCallback(
    (current) => {
      const range = Math.max(0.0001, maximum - minimum);
      return clamp((current - minimum) / range, 0, 1);
    },
    [maximum, minimum],
  );

  const updateFromLocation = useCallback(
    (x) => {
      const safeX = clamp(x, 0, trackWidth);
      const percent = safeX / Math.max(1, trackWidth);
      const next = minimum + percent * (maximum - minimum);
      onChange(next);
    },
    [maximum, minimum, onChange, trackWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          updateFromLocation(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          updateFromLocation(event.nativeEvent.locationX);
        },
      }),
    [updateFromLocation],
  );

  const percent = valueToPercent(value);
  const knobLeft = Math.max(0, percent * trackWidth - 10);

  return (
    <View style={styles.sliderWrapper}>
      <Text style={styles.sliderLabel}>Zoom</Text>
      <View
        style={styles.sliderTrack}
        onLayout={(event) => {
          setTrackWidth(Math.max(1, event.nativeEvent.layout.width));
        }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.sliderTrackFill, { width: `${percent * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: knobLeft }]} />
      </View>
    </View>
  );
};

const ImageCropScreen = ({ route, navigation }) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isWeb = Platform.OS === 'web';
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const imageUri = route.params?.imageUri || '';
  const returnScreen = route.params?.returnScreen || 'Profilo';
  const requestId = route.params?.requestId || Date.now();
  const fallbackWidth = route.params?.imageWidth || 0;
  const fallbackHeight = route.params?.imageHeight || 0;
  const initialRatio = route.params?.initialRatio === '4:5' ? '4:5' : '1:1';

  const [ratioKey, setRatioKey] = useState(initialRatio);
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [sourceSize, setSourceSize] = useState({
    width: Math.max(1, Number(fallbackWidth) || 1),
    height: Math.max(1, Number(fallbackHeight) || 1),
  });
  const [loadingSize, setLoadingSize] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [bodyWidth, setBodyWidth] = useState(0);

  const translateRef = useRef(translate);
  const zoomRef = useRef(zoom);
  const panStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    translateRef.current = translate;
  }, [translate]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    let isMounted = true;
    if (!imageUri) {
      setLoadingSize(false);
      return undefined;
    }

    setLoadingSize(true);
    readImageSize(imageUri, fallbackWidth, fallbackHeight).then((size) => {
      if (!isMounted) return;
      setSourceSize(size);
      setLoadingSize(false);
    });

    return () => {
      isMounted = false;
    };
  }, [fallbackHeight, fallbackWidth, imageUri]);

  const activeRatio = useMemo(
    () => RATIO_OPTIONS.find((item) => item.key === ratioKey) || RATIO_OPTIONS[0],
    [ratioKey],
  );

  const supportsStickyActionBar = useMemo(() => {
    if (!isWeb || typeof window === 'undefined') return false;
    const cssSupports = window.CSS?.supports;
    if (typeof cssSupports !== 'function') return false;
    return cssSupports('position', 'sticky') || cssSupports('position', '-webkit-sticky');
  }, [isWeb]);

  const useFixedActionBar = isWeb && !supportsStickyActionBar;
  const horizontalPadding = theme.spacing.lg;
  const contentPaddingBottom = isWeb
    ? ACTION_BAR_HEIGHT + theme.spacing.lg
    : theme.spacing.lg;
  const availableWidth = useMemo(() => {
    const containerWidth = bodyWidth > 0 ? bodyWidth : windowWidth;
    return Math.max(220, containerWidth - horizontalPadding * 2);
  }, [bodyWidth, horizontalPadding, windowWidth]);

  const frameLayout = useMemo(() => {
    const viewportHeight = Math.max(320, Number(windowHeight) || 320);
    const maxHeight = Math.max(220, Math.min(500, viewportHeight * 0.55));
    const maxWidth = isWeb ? WEB_MAX_FRAME_WIDTH : 460;
    let width = Math.max(220, Math.min(availableWidth, maxWidth));
    let height = width / activeRatio.value;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * activeRatio.value;
    }
    return { width, height };
  }, [activeRatio.value, availableWidth, isWeb, windowHeight]);

  const baseScale = useMemo(
    () =>
      Math.max(
        frameLayout.width / Math.max(1, sourceSize.width),
        frameLayout.height / Math.max(1, sourceSize.height),
      ),
    [frameLayout.height, frameLayout.width, sourceSize.height, sourceSize.width],
  );
  const effectiveScale = baseScale * zoom;
  const displayedWidth = sourceSize.width * effectiveScale;
  const displayedHeight = sourceSize.height * effectiveScale;

  const clampTranslation = useCallback(
    (x, y, zoomValue = zoomRef.current) =>
      clampTranslationToFrame({
        translateX: x,
        translateY: y,
        imageWidth: sourceSize.width,
        imageHeight: sourceSize.height,
        frameWidth: frameLayout.width,
        frameHeight: frameLayout.height,
        scale: baseScale * zoomValue,
      }),
    [
      baseScale,
      frameLayout.height,
      frameLayout.width,
      sourceSize.height,
      sourceSize.width,
    ],
  );

  useEffect(() => {
    setTranslate((previous) => clampTranslation(previous.x, previous.y, zoom));
  }, [clampTranslation, zoom, ratioKey]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 1 || Math.abs(gestureState.dy) > 1,
        onPanResponderGrant: () => {
          panStartRef.current = translateRef.current;
        },
        onPanResponderMove: (_event, gestureState) => {
          const nextX = panStartRef.current.x + gestureState.dx;
          const nextY = panStartRef.current.y + gestureState.dy;
          setTranslate(clampTranslation(nextX, nextY, zoomRef.current));
        },
      }),
    [clampTranslation],
  );

  const handleChangeZoom = useCallback(
    (nextValue) => {
      const safeZoom = clamp(nextValue, MIN_ZOOM, MAX_ZOOM);
      setZoom(safeZoom);
      setTranslate((previous) => clampTranslation(previous.x, previous.y, safeZoom));
    },
    [clampTranslation],
  );

  const closeWithResult = useCallback(
    (payload) => {
      navigation.navigate(returnScreen, payload);
    },
    [navigation, returnScreen],
  );

  const handleCancel = useCallback(() => {
    closeWithResult({
      cropCanceledAt: Date.now(),
      cropRequestId: requestId,
    });
  }, [closeWithResult, requestId]);

  const handleConfirm = useCallback(async () => {
    if (!imageUri || processing) return;
    setProcessing(true);
    try {
      const cropRect = computeCropRect({
        imageWidth: sourceSize.width,
        imageHeight: sourceSize.height,
        frameWidth: frameLayout.width,
        frameHeight: frameLayout.height,
        translateX: translate.x,
        translateY: translate.y,
        scale: effectiveScale,
      });

      const processed = await processPostImageForUpload({
        uri: imageUri,
        sourceWidth: sourceSize.width,
        sourceHeight: sourceSize.height,
        cropRect,
        maxLongSide: 1600,
        compress: 0.8,
      });

      closeWithResult({
        croppedPostImage: {
          uri: processed.uri,
          width: processed.width,
          height: processed.height,
          requestId,
        },
      });
    } catch (error) {
      console.warn('[image-crop] processing failed:', error?.message || error);
      if (Platform.OS === 'web') {
        Alert.alert(
          'Ritaglio immagine',
          "Si e verificato un errore durante l'elaborazione. Verra usata l'immagine originale.",
        );
        closeWithResult({
          croppedPostImage: {
            uri: imageUri,
            width: sourceSize.width,
            height: sourceSize.height,
            requestId,
          },
        });
      } else {
        Alert.alert('Ritaglio immagine', 'Impossibile completare il ritaglio. Riprova.');
      }
    } finally {
      setProcessing(false);
    }
  }, [
    closeWithResult,
    effectiveScale,
    frameLayout.height,
    frameLayout.width,
    imageUri,
    processing,
    requestId,
    sourceSize.height,
    sourceSize.width,
    translate.x,
    translate.y,
  ]);

  if (!imageUri) {
    return (
      <SafeAreaView style={[styles.safeArea, isWeb && styles.safeAreaWeb]}>
        <View style={[styles.centerState, isWeb && styles.webInsets]}>
          <Text style={styles.stateText}>Immagine non disponibile.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleCancel}>
            <Text style={styles.primaryButtonText}>Torna indietro</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.safeAreaWeb]}>
      <View style={[styles.root, isWeb && styles.rootWeb, isWeb && styles.webInsets]}>
        <View style={styles.header}>
          <Text style={styles.title}>Ritaglia immagine</Text>
          <Text style={styles.subtitle}>Scegli formato, zoom e posizione.</Text>
        </View>

        <View
          style={styles.body}
          onLayout={(event) => {
            const width = Math.max(220, Math.floor(event.nativeEvent.layout.width));
            setBodyWidth(width);
          }}
        >
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={[
              styles.bodyContent,
              {
                paddingHorizontal: horizontalPadding,
                paddingBottom: contentPaddingBottom,
              },
            ]}
            showsVerticalScrollIndicator
          >
            <View style={styles.ratioRow}>
              {RATIO_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.ratioButton,
                    ratioKey === option.key && styles.ratioButtonActive,
                  ]}
                  onPress={() => {
                    setRatioKey(option.key);
                    setTranslate({ x: 0, y: 0 });
                  }}
                  disabled={processing}
                >
                  <Text
                    style={[
                      styles.ratioButtonText,
                      ratioKey === option.key && styles.ratioButtonTextActive,
                    ]}
                  >
                    {option.key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.stage}>
              <View
                style={[
                  styles.cropFrame,
                  {
                    width: frameLayout.width,
                    height: frameLayout.height,
                  },
                ]}
                {...panResponder.panHandlers}
              >
                {loadingSize ? (
                  <ActivityIndicator size="small" color={theme.colors.secondary} />
                ) : (
                  <Image
                    source={{ uri: imageUri }}
                    style={{
                      width: displayedWidth,
                      height: displayedHeight,
                      transform: [
                        { translateX: translate.x },
                        { translateY: translate.y },
                      ],
                    }}
                    resizeMode="cover"
                  />
                )}
              </View>
            </View>

            <ZoomSlider value={zoom} onChange={handleChangeZoom} theme={theme} />
          </ScrollView>
        </View>

        <View
          style={[
            styles.actionBar,
            isWeb && styles.actionBarWeb,
            isWeb && (useFixedActionBar ? styles.actionBarWebFixed : styles.actionBarWebSticky),
          ]}
        >
          <View style={[styles.actionsRow, isWeb ? styles.actionsRowWeb : styles.actionsRowMobile]}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                styles.actionButton,
                isWeb ? styles.actionButtonWeb : styles.actionButtonMobile,
                processing && styles.buttonDisabled,
              ]}
              onPress={handleCancel}
              disabled={processing}
            >
              <Text style={styles.secondaryButtonText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.actionButton,
                isWeb ? styles.actionButtonWeb : styles.actionButtonMobile,
                processing && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={processing || loadingSize}
            >
              {processing ? (
                <ActivityIndicator size="small" color={theme.colors.card} />
              ) : (
                <Text style={styles.primaryButtonText}>Conferma</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    safeAreaWeb: {
      width: '100%',
      minHeight: '100vh',
    },
    root: {
      flex: 1,
      width: '100%',
    },
    rootWeb: {
      minHeight: '100vh',
      paddingTop: WEB_ROOT_TOP_PADDING,
    },
    webInsets: {
      paddingLeft: WEB_TAB_BAR_WIDTH,
      paddingRight: WEB_SIDE_MENU_WIDTH,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
    },
    body: {
      flex: 1,
      width: '100%',
    },
    bodyScroll: {
      flex: 1,
    },
    bodyContent: {
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    title: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    subtitle: {
      color: theme.colors.muted,
      fontSize: 14,
      marginTop: -4,
    },
    ratioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    ratioButton: {
      paddingVertical: 8,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    ratioButtonActive: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.secondary,
    },
    ratioButtonText: {
      color: theme.colors.text,
      fontWeight: '700',
    },
    ratioButtonTextActive: {
      color: theme.colors.card,
    },
    stage: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 260,
    },
    cropFrame: {
      overflow: 'hidden',
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.colors.secondary,
      backgroundColor: '#000000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sliderWrapper: {
      gap: theme.spacing.xs,
    },
    sliderLabel: {
      color: theme.colors.text,
      fontWeight: '700',
    },
    sliderTrack: {
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    sliderTrackFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: 'rgba(38,113,255,0.30)',
    },
    sliderThumb: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.secondary,
      borderWidth: 2,
      borderColor: theme.colors.card,
    },
    actionsRow: {
      alignItems: 'stretch',
      gap: theme.spacing.sm,
      width: '100%',
    },
    actionsRowWeb: {
      flexDirection: 'row',
    },
    actionsRowMobile: {
      flexDirection: 'column',
    },
    actionBar: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      minHeight: ACTION_BAR_HEIGHT,
    },
    actionBarWeb: {
      backgroundColor: '#ffffff',
      borderTopColor: '#eeeeee',
      zIndex: 50,
    },
    actionBarWebSticky: {
      position: 'sticky',
      bottom: 0,
      width: '100%',
      alignSelf: 'stretch',
    },
    actionBarWebFixed: {
      position: 'fixed',
      left: WEB_TAB_BAR_WIDTH,
      right: WEB_SIDE_MENU_WIDTH,
      bottom: 0,
      zIndex: 60,
    },
    actionButton: {
      minHeight: 44,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
    },
    actionButtonWeb: {
      flex: 1,
    },
    actionButtonMobile: {
      width: '100%',
    },
    primaryButton: {
      minHeight: 44,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.secondary,
    },
    primaryButtonText: {
      color: theme.colors.card,
      fontWeight: '800',
    },
    secondaryButton: {
      minHeight: 44,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    secondaryButtonText: {
      color: theme.colors.text,
      fontWeight: '700',
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    stateText: {
      color: theme.colors.muted,
      textAlign: 'center',
    },
  });

export default ImageCropScreen;
