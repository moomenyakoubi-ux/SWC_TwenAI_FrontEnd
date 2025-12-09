import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import theme from '../styles/theme';

const Card = ({ title, subtitle, description, image, footer, isRTL = false }) => {
  const directionalText = isRTL ? styles.rtlText : null;
  return (
    <View style={styles.card}>
      {image ? <Image source={{ uri: image }} style={styles.image} /> : null}
      <View style={styles.content}>
        {subtitle ? <Text style={[styles.subtitle, directionalText]}>{subtitle}</Text> : null}
        <Text style={[styles.title, directionalText]}>{title}</Text>
        {description ? <Text style={[styles.description, directionalText]}>{description}</Text> : null}
        {footer ? <Text style={[styles.footer, directionalText]}>{footer}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    marginVertical: theme.spacing.sm,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  footer: {
    fontSize: 13,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default Card;
