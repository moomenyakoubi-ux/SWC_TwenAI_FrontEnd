import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

const Card = ({ title, subtitle, description, image, footer, isRTL = false }) => {
  const { theme: appTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
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

const createStyles = (appTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      marginVertical: appTheme.spacing.sm,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      ...appTheme.shadow.card,
    },
    image: {
      width: '100%',
      height: 160,
    },
    content: {
      padding: appTheme.spacing.md,
      gap: appTheme.spacing.xs,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: appTheme.colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: appTheme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '600',
    },
    description: {
      fontSize: 14,
      color: appTheme.colors.muted,
      lineHeight: 20,
    },
    footer: {
      fontSize: 13,
      color: appTheme.colors.secondary,
      fontWeight: '600',
    },
    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
  });

export default Card;
