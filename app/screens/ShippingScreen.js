import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';
import WebSidebar, { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';
import ComingSoonScreen from './ComingSoonScreen';

const ShippingOption = ({ icon, title, description, onPress, isRTL }) => (
  <TouchableOpacity
    style={[styles.optionCard, isRTL && styles.optionCardRtl]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <LinearGradient
      colors={['#0066CC', '#00CCFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.iconBox}
    >
      <Ionicons name={icon} size={28} color="#FFFFFF" />
    </LinearGradient>
    <View style={[styles.textContainer, isRTL && styles.textContainerRtl]}>
      <Text style={[styles.optionTitle, isRTL && styles.rtlText]}>{title}</Text>
      <Text style={[styles.optionDescription, isRTL && styles.rtlText]}>{description}</Text>
    </View>
    <Ionicons
      name={isRTL ? 'chevron-back' : 'chevron-forward'}
      size={24}
      color={theme.colors.muted}
    />
  </TouchableOpacity>
);

const ShippingMenu = ({ navigation, isWeb, isRTL, strings, menuStrings }) => {
  const [selectedOption, setSelectedOption] = useState(null);

  if (selectedOption === 'packages') {
    return (
      <ComingSoonScreen
        title={strings.shipping?.packageShipping || 'Spedizione Pacchi'}
        icon="cube"
        onBack={() => setSelectedOption(null)}
      />
    );
  }

  if (selectedOption === 'money') {
    return (
      <ComingSoonScreen
        title={strings.shipping?.moneyShipping || 'Spedizione Soldi'}
        icon="cash"
        onBack={() => setSelectedOption(null)}
      />
    );
  }

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {strings.tabs?.shipping || 'Spedizioni'}
        </Text>
        <Text style={[styles.headerSubtitle, isRTL && styles.rtlText]}>
          {strings.shipping?.chooseOption || 'Scegli un tipo di spedizione'}
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        <ShippingOption
          icon="cube"
          title={strings.shipping?.packageShipping || 'Spedizione Pacchi'}
          description={strings.shipping?.packageDesc || 'Spedisci pacchi in Italia e Tunisia'}
          onPress={() => setSelectedOption('packages')}
          isRTL={isRTL}
        />

        <ShippingOption
          icon="cash"
          title={strings.shipping?.moneyShipping || 'Spedizione Soldi'}
          description={strings.shipping?.moneyDesc || 'Trasferisci denaro in sicurezza'}
          onPress={() => setSelectedOption('money')}
          isRTL={isRTL}
        />
      </View>

      <WebSidebar
        title={strings.home?.greeting || strings.tabs?.shipping}
        menuStrings={menuStrings}
        navigation={navigation}
        isRTL={isRTL}
      />
    </View>
  );
};

const ShippingScreen = ({ navigation }) => {
  const { strings, isRTL } = useLanguage();
  const isWeb = Platform.OS === 'web';
  const menuStrings = strings.menu;

  return (
    <ShippingMenu
      navigation={navigation}
      isWeb={isWeb}
      isRTL={isRTL}
      strings={strings}
      menuStrings={menuStrings}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  containerWeb: {
    paddingLeft: WEB_TAB_BAR_WIDTH + theme.spacing.lg,
    paddingRight: WEB_SIDE_MENU_WIDTH + theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  optionsContainer: {
    gap: theme.spacing.md,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  optionCardRtl: {
    flexDirection: 'row-reverse',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  textContainerRtl: {
    alignItems: 'flex-end',
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default ShippingScreen;
