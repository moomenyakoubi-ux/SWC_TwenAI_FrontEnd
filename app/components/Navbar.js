import React from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';
import { WEB_TAB_BAR_WIDTH } from './WebTabBar';

const Navbar = ({ title, rightContent, onBack, backLabel, isRTL = false, isElevated = false }) => {
  const isWeb = Platform.OS === 'web';
  return (
    <SafeAreaView style={[styles.safeArea, isWeb && isElevated && styles.webSafeArea]}>
      <StatusBar barStyle="light-content" />
      <View style={[
        styles.container,
        isRTL && styles.rtlContainer,
        isWeb && isElevated && styles.webContainer,
      ]}>
        <View style={[styles.leftGroup, isRTL && styles.leftGroupRtl]}>
          {onBack ? (
            <TouchableOpacity
              accessibilityLabel={backLabel || title}
              onPress={onBack}
              style={[styles.backButton, isRTL && styles.backButtonRtl]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={22}
                color={theme.colors.card}
              />
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.title, isRTL && styles.rtlText]}>{title}</Text>
        </View>
        {rightContent ? <View>{rightContent}</View> : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.secondary,
    paddingTop: Platform.OS === 'android' ? theme.spacing.sm : 0,
  },
  webSafeArea: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
  },
  webContainer: {
    minHeight: 64,
    paddingVertical: theme.spacing.md,
    paddingLeft: theme.spacing.lg + WEB_TAB_BAR_WIDTH,
    paddingRight: theme.spacing.xl,
    zIndex: 20,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  leftGroupRtl: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.card,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonRtl: {
    borderColor: 'rgba(255,255,255,0.45)',
  },
  rtlContainer: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default Navbar;
