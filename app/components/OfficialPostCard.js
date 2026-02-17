import React, { useCallback, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

const OfficialPostCard = ({ item, isRTL, onPressTargetUrl }) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasTargetUrl = Boolean(String(item?.target_url || '').trim());

  const handlePress = useCallback(() => {
    if (!hasTargetUrl) return;
    onPressTargetUrl?.(item.target_url);
  }, [hasTargetUrl, item?.target_url, onPressTargetUrl]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={!hasTargetUrl}
      accessibilityRole={hasTargetUrl ? 'link' : undefined}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.badge}>TwensAI</Text>
      </View>
      {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : null}
      {item.title ? <Text style={[styles.title, isRTL && styles.rtlText]}>{item.title}</Text> : null}
      {item.body ? <Text style={[styles.body, isRTL && styles.rtlText]}>{item.body}</Text> : null}
      {hasTargetUrl ? <Text style={[styles.cta, isRTL && styles.rtlText]}>Apri</Text> : null}
    </Pressable>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    pressed: {
      opacity: 0.92,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(231, 0, 19, 0.15)',
      color: theme.colors.secondary,
      fontWeight: '700',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: 180,
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceMuted,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    body: {
      color: theme.colors.muted,
      fontSize: 14,
      lineHeight: 20,
    },
    cta: {
      marginTop: theme.spacing.sm,
      color: theme.colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
  });

export default OfficialPostCard;
