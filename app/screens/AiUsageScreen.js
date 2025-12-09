import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Navbar from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';
import theme from '../styles/theme';

const AiUsageScreen = () => {
  const { strings, isRTL } = useLanguage();
  const menuStrings = strings.menu;
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Navbar
        title={menuStrings.aiUsage}
        isRTL={isRTL}
        onBack={() => navigation.navigate('Home')}
        backLabel={strings.tabs.home}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{menuStrings.aiUsage}</Text>
        <Text style={[styles.paragraph, isRTL && styles.rtlText]}>{menuStrings.aiUsageDescription}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  paragraph: {
    fontSize: 16,
    color: theme.colors.muted,
    lineHeight: 22,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default AiUsageScreen;
