import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import ResponsiveMedia from './ResponsiveMedia';
import { getBestMediaInfo } from '../utils/media';

const DEFAULT_CONTENT_ASPECT_RATIO = 4 / 5;

const formatStartsAt = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const EventNewsCard = ({ item, isRTL, onPress, accessibilityRole, eventBadgeLabel, newsBadgeLabel }) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isEvent = item?.type === 'event';
  const badgeLabel = isEvent ? eventBadgeLabel || 'Evento' : newsBadgeLabel || 'Notizia';
  const preview = item?.excerpt || item?.content || '';
  const eventMeta = isEvent ? [item?.location, formatStartsAt(item?.starts_at)].filter(Boolean).join(' • ') : '';
  const { uri: sourceUri, aspectRatio } = useMemo(
    () => getBestMediaInfo(item, DEFAULT_CONTENT_ASPECT_RATIO),
    [item],
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? accessibilityRole || 'button' : undefined}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
    >
      {sourceUri ? (
        <View style={styles.mediaSection}>
          <ResponsiveMedia
            uri={sourceUri}
            aspectRatio={aspectRatio}
          />
        </View>
      ) : null}
      <View style={styles.textSection}>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, isEvent ? styles.eventBadge : styles.newsBadge]}>{badgeLabel}</Text>
        </View>
        {item?.title ? <Text style={[styles.title, isRTL && styles.rtlText]}>{item.title}</Text> : null}
        {preview ? <Text style={[styles.preview, isRTL && styles.rtlText]}>{preview}</Text> : null}
        {eventMeta ? <Text style={[styles.meta, isRTL && styles.rtlText]}>{eventMeta}</Text> : null}
      </View>
    </Pressable>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    card: {
      width: '100%',
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.lg,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      ...theme.shadow.card,
    },
    pressed: {
      opacity: 0.92,
    },
    mediaSection: {
      width: '100%',
      alignItems: 'center',
    },
    textSection: {
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    badgeRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.xs,
    },
    badge: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      overflow: 'hidden',
    },
    eventBadge: {
      color: '#8A1C09',
      backgroundColor: 'rgba(242, 163, 101, 0.25)',
    },
    newsBadge: {
      color: theme.colors.secondary,
      backgroundColor: 'rgba(231, 0, 19, 0.12)',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.text,
    },
    preview: {
      fontSize: 14,
      lineHeight: 21,
      color: theme.colors.muted,
    },
    meta: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.secondary,
      marginTop: theme.spacing.xs,
    },
    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
  });

export default EventNewsCard;
