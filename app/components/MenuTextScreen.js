import React, { useMemo } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Navbar from './Navbar';
import { useAppTheme } from '../context/ThemeContext';
import { WEB_TAB_BAR_WIDTH } from './WebTabBar';
import { WEB_SIDE_MENU_WIDTH } from './WebSidebar';

const MenuTextScreen = ({ title, description, isRTL = false, backLabel, onBack }) => {
  const { theme: appTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const isWeb = Platform.OS === 'web';

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.webSafeArea]}>
      <Navbar title={title} isRTL={isRTL} onBack={onBack} backLabel={backLabel} />
      <ScrollView contentContainerStyle={[styles.content, isWeb && styles.webContent]}>
        <View style={styles.card}>
          <Text style={[styles.title, isRTL && styles.rtlText]}>{title}</Text>
          <Text style={[styles.paragraph, isRTL && styles.rtlText]}>{description}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (appTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: appTheme.colors.background,
    },
    webSafeArea: {
      paddingLeft: WEB_TAB_BAR_WIDTH,
    },
    content: {
      padding: appTheme.spacing.lg,
      gap: appTheme.spacing.md,
    },
    webContent: {
      paddingLeft: appTheme.spacing.xl,
      paddingRight: appTheme.spacing.xl + WEB_SIDE_MENU_WIDTH,
      width: '100%',
      maxWidth: 960,
      alignSelf: 'center',
    },
    card: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.lg,
      gap: appTheme.spacing.md,
      ...appTheme.shadow.card,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: appTheme.colors.text,
    },
    paragraph: {
      fontSize: 16,
      color: appTheme.colors.muted,
      lineHeight: 22,
    },
    rtlText: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
  });

export default MenuTextScreen;
