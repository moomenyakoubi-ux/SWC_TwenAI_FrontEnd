import React from 'react';
import { useNavigation } from '@react-navigation/native';
import MenuTextScreen from '../components/MenuTextScreen';
import { useLanguage } from '../context/LanguageContext';

const SupportScreen = () => {
  const { strings, isRTL } = useLanguage();
  const menuStrings = strings.menu;
  const navigation = useNavigation();

  return (
    <MenuTextScreen
      title={menuStrings.support}
      description={menuStrings.supportDescription}
      isRTL={isRTL}
      onBack={() => navigation.navigate('Home')}
      backLabel={strings.tabs.home}
    />
  );
};

export default SupportScreen;
