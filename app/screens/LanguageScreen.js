import React from 'react';
import { Alert, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Navbar from '../components/Navbar';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';
import useSession from '../auth/useSession';
import useProfile from '../profile/useProfile';

const LanguageScreen = () => {
  const { language, setLanguage, strings, isRTL } = useLanguage();
  const { user } = useSession();
  const { updateProfile } = useProfile();
  const isWeb = Platform.OS === 'web';
  const { language: languageStrings } = strings;
  const navigation = useNavigation();

  const options = [
    { code: 'it', label: languageStrings.italian },
    { code: 'ar', label: languageStrings.arabic },
  ];

  const handleSelectLanguage = async (code) => {
    setLanguage(code);
    if (!user) return;
    try {
      await updateProfile({ language: code });
    } catch (updateError) {
      Alert.alert('Errore', updateError.message);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.webSafeArea]}>
      <Navbar
        title={languageStrings.title}
        isRTL={isRTL}
        onBack={() => navigation.navigate('Home')}
        backLabel={strings.tabs.home}
      />
      <View style={[styles.container, isWeb && styles.webContainer]}>
        <Text style={[styles.description, isRTL && styles.rtlText]}>{languageStrings.description}</Text>
        <View style={styles.options}>
          {options.map((option) => {
            const isActive = option.code === language;
            return (
              <TouchableOpacity
                key={option.code}
                style={[styles.option, isActive && styles.optionActive]}
                onPress={() => handleSelectLanguage(option.code)}
              >
                <Text
                  style={[styles.optionLabel, isActive && styles.optionLabelActive, isRTL && styles.optionLabelRtl]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.helper, isRTL && styles.rtlText]}>
          {languageStrings.currentLabel}: {language === 'it' ? languageStrings.italian : languageStrings.arabic}
        </Text>
        <Text style={[styles.helper, isRTL && styles.rtlText]}>{languageStrings.helper}</Text>
      </View>
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
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  webContainer: {
    paddingHorizontal: theme.spacing.xl,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  description: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  options: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  option: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: theme.colors.secondary,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.secondary,
    textAlign: 'center',
  },
  optionLabelActive: {
    color: theme.colors.card,
  },
  helper: {
    marginTop: theme.spacing.lg,
    fontSize: 14,
    color: theme.colors.muted,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  optionLabelRtl: {
    writingDirection: 'rtl',
  },
});

export default LanguageScreen;
