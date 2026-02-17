import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

const formatStartsAt = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const EventNewsCard = ({ item, isRTL, onPress, accessibilityRole }) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isEvent = item?.type === 'event';
  const badgeLabel = isEvent ? 'Evento' : 'Notizia';
  const preview = item?.excerpt || item?.content || '';
  const eventMeta = isEvent ? [item?.location, formatStartsAt(item?.starts_at)].filter(Boolean).join(' • ') : '';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? accessibilityRole || 'button' : undefined}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
    >
      {item?.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : null}
      <View style={styles.content}>
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
    image: {
      width: '100%',
      height: 170,
      backgroundColor: theme.colors.surfaceMuted,
    },
    content: {
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
