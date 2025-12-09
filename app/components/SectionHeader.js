import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import theme from '../styles/theme';

const SectionHeader = ({ title, action, isRTL = false }) => {
  return (
    <View style={[styles.container, isRTL && styles.rtlContainer]}>
      <Text style={[styles.title, isRTL && styles.rtlText]}>{title}</Text>
      {action ? <View>{action}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  rtlContainer: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default SectionHeader;
