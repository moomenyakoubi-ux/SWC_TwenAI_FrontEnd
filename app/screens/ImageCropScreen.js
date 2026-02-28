import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
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

const RATIOS = [
  {
    key: '1:1',
    label: '1:1',
    description: 'Quadrato',
    ratio: 1,
    orientation: 'square',
  },
  {
    key: '4:5',
    label: '4:5',
    description: 'Verticale',
    ratio: 4 / 5,
    orientation: 'portrait',
  },
  {
    key: '3:4',
    label: '3:4',
    description: 'Verticale classico',
    ratio: 3 / 4,
    orientation: 'portrait',
  },
  {
    key: '16:9',
    label: '16:9',
    description: 'Orizzontale',
    ratio: 16 / 9,
    orientation: 'landscape',
  },
  {
    key: '9:16',
    label: '9:16',
    description: 'Storia',
    ratio: 9 / 16,
    orientation: 'portrait',
  },
];
const PRIMARY_RATIO_KEYS = ['1:1', '4:5'];
const EXTRA_RATIO_KEYS = ['3:4', '16:9', '9:16'];
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ACTION_BAR_HEIGHT = 88;
const WEB_MAX_FRAME_WIDTH = 520;
const WEB_ROOT_TOP_PADDING = 16;
const SWIPE_CLOSE_THRESHOLD = 80;
const SQUARE_TOLERANCE = 0.08;

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
  const initialRatioParam = route.params?.initialRatio;
  const initialRatio = RATIOS.some((item) => item.key === initialRatioParam)
    ? initialRatioParam
    : '1:1';

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
  const [isMoreSheetVisible, setIsMoreSheetVisible] = useState(false);

  const translateRef = useRef(translate);
  const zoomRef = useRef(zoom);
  const panStartRef = useRef({ x: 0, y: 0 });
  const sheetTranslateY = useRef(new Animated.Value(Math.max(windowHeight, 1))).current;

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

  const primaryRatios = useMemo(
    () => RATIOS.filter((item) => PRIMARY_RATIO_KEYS.includes(item.key)),
    [],
  );
  const extraRatios = useMemo(
    () => RATIOS.filter((item) => EXTRA_RATIO_KEYS.includes(item.key)),
    [],
  );
  const activeRatio = useMemo(
    () => RATIOS.find((item) => item.key === ratioKey) || RATIOS[0],
    [ratioKey],
  );
  const recommendedRatioKey = useMemo(() => {
    const width = Math.max(1, sourceSize.width);
    const height = Math.max(1, sourceSize.height);
    const delta = Math.abs(width - height) / Math.max(width, height);
    if (delta <= SQUARE_TOLERANCE) {
      return '1:1';
    }
    if (width > height) {
      return '16:9';
    }
    return '4:5';
  }, [sourceSize.height, sourceSize.width]);
  const isPrimaryRatioSelected = PRIMARY_RATIO_KEYS.includes(ratioKey);
  const moreButtonLabel = isPrimaryRatioSelected ? 'Altro ▾' : `Altro (${ratioKey})`;
  const sheetClosedTranslateY = Math.max(windowHeight, 360);

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
    let height = width / activeRatio.ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * activeRatio.ratio;
    }
    return { width, height };
  }, [activeRatio.ratio, availableWidth, isWeb, windowHeight]);

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

  useEffect(() => {
    if (!isMoreSheetVisible) {
      sheetTranslateY.setValue(sheetClosedTranslateY);
      return;
    }
    sheetTranslateY.setValue(sheetClosedTranslateY);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isMoreSheetVisible, sheetClosedTranslateY, sheetTranslateY]);

  const closeMoreSheet = useCallback(() => {
    if (!isMoreSheetVisible) return;
    Animated.timing(sheetTranslateY, {
      toValue: sheetClosedTranslateY,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsMoreSheetVisible(false);
      sheetTranslateY.setValue(sheetClosedTranslateY);
    });
  }, [isMoreSheetVisible, sheetClosedTranslateY, sheetTranslateY]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          if (isWeb) return false;
          return gestureState.dy > 2 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        },
        onPanResponderMove: (_event, gestureState) => {
          const nextTranslateY = clamp(gestureState.dy, 0, sheetClosedTranslateY);
          sheetTranslateY.setValue(nextTranslateY);
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dy > SWIPE_CLOSE_THRESHOLD) {
            closeMoreSheet();
            return;
          }
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 220,
            mass: 0.8,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 220,
            mass: 0.8,
          }).start();
        },
      }),
    [closeMoreSheet, isWeb, sheetClosedTranslateY, sheetTranslateY],
  );

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

  const applyRatio = useCallback((nextRatioKey) => {
    setRatioKey(nextRatioKey);
    setZoom(MIN_ZOOM);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const handleSelectPrimaryRatio = useCallback(
    (nextRatioKey) => {
      if (processing) return;
      applyRatio(nextRatioKey);
    },
    [applyRatio, processing],
  );

  const handleOpenMore = useCallback(() => {
    if (processing) return;
    setIsMoreSheetVisible(true);
  }, [processing]);

  const handleSelectExtraRatio = useCallback(
    (nextRatioKey) => {
      applyRatio(nextRatioKey);
      closeMoreSheet();
    },
    [applyRatio, closeMoreSheet],
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
      const selectedRatioKey = ratioKey;
      console.log('[CROP_CONFIRM]', {
        ratioKey: selectedRatioKey,
        width: processed.width,
        height: processed.height,
        ar: processed.width / processed.height,
        uri: processed.uri,
      });

      closeWithResult({
        croppedPostImage: {
          uri: processed.uri,
          width: processed.width,
          height: processed.height,
          ratioKey: selectedRatioKey,
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
            ratioKey,
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
    ratioKey,
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
    <>
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
                {primaryRatios.map((option) => {
                  const isActive = ratioKey === option.key;
                  const isRecommended = recommendedRatioKey === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.ratioButton, isActive && styles.ratioButtonActive]}
                      onPress={() => handleSelectPrimaryRatio(option.key)}
                      disabled={processing}
                    >
                      <View style={styles.ratioButtonContent}>
                        <Text
                          style={[
                            styles.ratioButtonText,
                            isActive && styles.ratioButtonTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {isRecommended ? (
                          <View
                            style={[
                              styles.recommendedBadge,
                              isActive && styles.recommendedBadgeActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.recommendedBadgeText,
                                isActive && styles.recommendedBadgeTextActive,
                              ]}
                            >
                              Consigliato
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.ratioButton,
                    !isPrimaryRatioSelected && styles.ratioButtonActive,
                  ]}
                  onPress={handleOpenMore}
                  disabled={processing}
                >
                  <Text
                    style={[
                      styles.ratioButtonText,
                      !isPrimaryRatioSelected && styles.ratioButtonTextActive,
                    ]}
                  >
                    {moreButtonLabel}
                  </Text>
                </TouchableOpacity>
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
              isWeb &&
                (useFixedActionBar ? styles.actionBarWebFixed : styles.actionBarWebSticky),
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

      <Modal
        visible={isMoreSheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeMoreSheet}
      >
        <View style={styles.sheetModalRoot}>
          <Pressable style={styles.sheetOverlay} onPress={closeMoreSheet} />
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
            {...(!isWeb ? sheetPanResponder.panHandlers : {})}
          >
            {!isWeb ? <View style={styles.sheetHandle} /> : null}
            <Text style={styles.sheetTitle}>Altri formati</Text>
            <Text style={styles.sheetSubtitle}>Scegli il formato migliore per il tuo contenuto.</Text>
            <View style={styles.sheetList}>
              {extraRatios.map((option) => {
                const isSelected = ratioKey === option.key;
                const isRecommended = recommendedRatioKey === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sheetItem,
                      isSelected && styles.sheetItemSelected,
                    ]}
                    onPress={() => handleSelectExtraRatio(option.key)}
                    disabled={processing}
                  >
                    <View style={styles.sheetItemHeader}>
                      <Text
                        style={[
                          styles.sheetItemLabel,
                          isSelected && styles.sheetItemLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isRecommended ? (
                        <View style={styles.sheetRecommendedBadge}>
                          <Text style={styles.sheetRecommendedBadgeText}>Consigliato</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.sheetItemDescription,
                        isSelected && styles.sheetItemDescriptionSelected,
                      ]}
                    >
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
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
      minHeight: 40,
      justifyContent: 'center',
    },
    ratioButtonActive: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.secondary,
    },
    ratioButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    ratioButtonText: {
      color: theme.colors.text,
      fontWeight: '700',
    },
    ratioButtonTextActive: {
      color: theme.colors.card,
    },
    recommendedBadge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: theme.colors.surfaceMuted,
    },
    recommendedBadgeActive: {
      backgroundColor: 'rgba(255,255,255,0.26)',
    },
    recommendedBadgeText: {
      color: theme.colors.text,
      fontSize: 10,
      fontWeight: '700',
    },
    recommendedBadgeTextActive: {
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
    sheetModalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheetOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    bottomSheet: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      paddingBottom: 24,
      backgroundColor: '#ffffff',
      gap: theme.spacing.sm,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 20,
    },
    sheetHandle: {
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: '#d7d7db',
      alignSelf: 'center',
      marginBottom: 8,
    },
    sheetTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: '#15161a',
    },
    sheetSubtitle: {
      fontSize: 13,
      color: '#6f7382',
      marginTop: -2,
      marginBottom: 4,
    },
    sheetList: {
      gap: 10,
      paddingBottom: 8,
    },
    sheetItem: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#e8e9ef',
      backgroundColor: '#f7f8fc',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    sheetItemSelected: {
      borderColor: theme.colors.secondary,
      backgroundColor: 'rgba(38,113,255,0.10)',
    },
    sheetItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    sheetItemLabel: {
      fontSize: 20,
      fontWeight: '800',
      color: '#16181d',
    },
    sheetItemLabelSelected: {
      color: theme.colors.secondary,
    },
    sheetItemDescription: {
      fontSize: 13,
      color: '#6f7382',
    },
    sheetItemDescriptionSelected: {
      color: '#2f4f9f',
      fontWeight: '600',
    },
    sheetRecommendedBadge: {
      borderRadius: 999,
      backgroundColor: '#e9ecf7',
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    sheetRecommendedBadgeText: {
      fontSize: 11,
      color: '#3f4f82',
      fontWeight: '700',
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
