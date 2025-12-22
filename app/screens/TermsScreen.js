import React from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Navbar from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';
import theme from '../styles/theme';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';
import { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';

const TermsScreen = () => {
  const { strings, isRTL } = useLanguage();
  const isWeb = Platform.OS === 'web';
  const menuStrings = strings.menu;
  const navigation = useNavigation();

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.webSafeArea]}>
      <Navbar
        title={menuStrings.terms}
        isRTL={isRTL}
        onBack={() => navigation.navigate('Home')}
        backLabel={strings.tabs.home}
      />
      <ScrollView contentContainerStyle={[styles.content, isWeb && styles.webContent]}>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{menuStrings.terms}</Text>
        <Text style={[styles.paragraph, isRTL && styles.rtlText]}>{menuStrings.termsDescription}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  webSafeArea: {
    paddingLeft: WEB_TAB_BAR_WIDTH,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  webContent: {
    paddingLeft: theme.spacing.xl,
    paddingRight: theme.spacing.xl + WEB_SIDE_MENU_WIDTH,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
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

export default TermsScreen;
