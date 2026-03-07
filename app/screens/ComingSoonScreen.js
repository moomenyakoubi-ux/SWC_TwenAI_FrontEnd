import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';

const ComingSoonScreen = ({ title, icon = 'construct' }) => {
  const { strings, isRTL } = useLanguage();
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0066CC', '#00CCFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Ionicons name={icon} size={48} color="#FFFFFF" />
      </LinearGradient>
      
      <Text style={[styles.title, isRTL && styles.rtlText]}>
        {title}
      </Text>
      
      <View style={styles.divider} />
      
      <Text style={[styles.message, isRTL && styles.rtlText]}>
        {strings.common?.comingSoon || 'Disponibile presto'}
      </Text>
      
      <Text style={[styles.subtitle, isRTL && styles.rtlText]}>
        {strings.common?.comingSoonSubtitle || 'Stiamo lavorando per offrirti questa funzionalità'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadow.card,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginVertical: theme.spacing.md,
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default ComingSoonScreen;
