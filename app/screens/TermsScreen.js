import React from 'react';
import { useNavigation } from '@react-navigation/native';
import MenuTextScreen from '../components/MenuTextScreen';
import { useLanguage } from '../context/LanguageContext';

const TermsScreen = () => {
  const { strings, isRTL } = useLanguage();
  const menuStrings = strings.menu;
  const navigation = useNavigation();

  return (
    <MenuTextScreen
      title={menuStrings.terms}
      description={menuStrings.termsDescription}
      isRTL={isRTL}
      onBack={() => navigation.navigate('Home')}
      backLabel={strings.tabs.home}
    />
  );
};

export default TermsScreen;
