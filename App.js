import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme as NavigationTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import HomeScreen from './app/screens/HomeScreen';
import ChatScreen from './app/screens/ChatScreen';
import NewsScreen from './app/screens/NewsScreen';
import ExperiencesScreen from './app/screens/ExperiencesScreen';
import TravelScreen from './app/screens/TravelScreen';
import LanguageScreen from './app/screens/LanguageScreen';
import ProfileScreen from './app/screens/ProfileScreen';
import AccountSettingsScreen from './app/screens/AccountSettingsScreen';
import AddContactScreen from './app/screens/AddContactScreen';
import PublicProfileScreen from './app/screens/PublicProfileScreen';
import PrivacyPolicyScreen from './app/screens/PrivacyPolicyScreen';
import TermsScreen from './app/screens/TermsScreen';
import CopyrightScreen from './app/screens/CopyrightScreen';
import CookiePolicyScreen from './app/screens/CookiePolicyScreen';
import AiUsageScreen from './app/screens/AiUsageScreen';
import SupportScreen from './app/screens/SupportScreen';
import { LanguageProvider, useLanguage } from './app/context/LanguageContext';
import { ContactsProvider } from './app/context/ContactsContext';
import ContactsScreen from './app/screens/ContactsScreen';
import { PostsProvider } from './app/context/PostsContext';
import theme from './app/styles/theme';
import WebTabBar from './app/components/WebTabBar';

const sharedBackgroundAsset = require('./app/images/image1.png');
const chatBackgroundAsset = require('./app/images/image2.png');

const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...NavigationTheme,
  colors: {
    ...NavigationTheme.colors,
    background: theme.colors.background,
    primary: theme.colors.primary,
    text: theme.colors.text,
  },
};

const AppTabs = () => {
  const { strings } = useLanguage();
  const isWeb = Platform.OS === 'web';
  const hiddenTabOptions = {
    tabBarButton: () => null,
    tabBarStyle: { display: 'none' },
    tabBarItemStyle: { display: 'none' },
  };

  const screenOptions = ({ route }) => ({
    tabBarIcon: ({ color, size }) => {
      const icons = {
        Home: 'home',
        Chat: 'chatbubble-ellipses',
        Notizie: 'newspaper',
        Eventi: 'calendar',
        Esperienze: 'calendar',
        Viaggi: 'airplane',
        Lingua: 'globe',
        Profilo: 'person',
        AccountSettings: 'settings',
        AddContact: 'person-add',
        PrivacyPolicy: 'shield-checkmark',
        Termini: 'document-text',
        Copyright: 'ribbon',
        CookiePolicy: 'ice-cream',
        AiUsage: 'sparkles',
        Support: 'call',
        Contacts: 'people',
      };
      const iconName = icons[route.name] || 'ellipse';
      return <Ionicons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.muted,
    tabBarStyle: {
      height: Platform.OS === 'web' ? 70 : 80,
      paddingBottom: Platform.OS === 'web' ? 14 : 18,
      paddingTop: 12,
      backgroundColor: '#fff',
      borderTopWidth: 0,
      marginBottom: Platform.OS === 'android' ? 6 : 0,
      ...theme.shadow.card,
    },
    headerShown: false,
  });

  const navigatorProps = isWeb ? { tabBar: (props) => <WebTabBar {...props} /> } : {};

  return (
    <Tab.Navigator screenOptions={screenOptions} {...navigatorProps}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: strings.tabs.home }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: strings.tabs.chat }} />
      <Tab.Screen name="Notizie" component={NewsScreen} options={{ tabBarLabel: strings.tabs.news }} />
      <Tab.Screen name="Esperienze" component={ExperiencesScreen} options={{ tabBarLabel: strings.tabs.experiences }} />
      <Tab.Screen name="Viaggi" component={TravelScreen} options={{ tabBarLabel: strings.tabs.travel }} />
      <Tab.Screen
        name="Lingua"
        component={LanguageScreen}
        options={{ tabBarLabel: strings.menu.language, ...hiddenTabOptions }}
      />
      <Tab.Screen
        name="Profilo"
        component={ProfileScreen}
        options={{ tabBarLabel: strings.menu.userProfile }}
      />
      <Tab.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{ tabBarLabel: strings.menu.accountSettings, ...hiddenTabOptions }}
      />
      <Tab.Screen
        name="AddContact"
        component={AddContactScreen}
        options={{ tabBarLabel: strings.menu.addContact, ...hiddenTabOptions }}
      />
      <Tab.Screen
        name="PublicProfile"
        component={PublicProfileScreen}
        options={{ tabBarLabel: strings.menu.userProfile, ...hiddenTabOptions }}
      />
      <Tab.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ tabBarLabel: strings.menu.privacy, ...hiddenTabOptions }}
      />
      <Tab.Screen
        name="Termini"
        component={TermsScreen}
        options={{ tabBarLabel: strings.menu.terms, ...hiddenTabOptions }}
      />
      <Tab.Screen
        name="Copyright"
        component={CopyrightScreen}
        options={{ tabBarLabel: strings.menu.copyright, ...hiddenTabOptions }}
      />
      <Tab.Screen
        name="CookiePolicy"
        component={CookiePolicyScreen}
        options={{ tabBarLabel: strings.menu.cookies, ...hiddenTabOptions }}
      />
      <Tab.Screen
        name="AiUsage"
        component={AiUsageScreen}
        options={{ tabBarLabel: strings.menu.aiUsage, ...hiddenTabOptions }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{ tabBarLabel: strings.menu.support, ...hiddenTabOptions }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{ tabBarLabel: strings.menu.contacts || 'Contatti', ...hiddenTabOptions }}
      />
    </Tab.Navigator>
  );
};

export default function App() {
  useEffect(() => {
    Asset.loadAsync([sharedBackgroundAsset, chatBackgroundAsset]);
  }, []);

  return (
    <LanguageProvider>
      <ContactsProvider>
        <PostsProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar barStyle="light-content" />
            <AppTabs />
          </NavigationContainer>
        </PostsProvider>
      </ContactsProvider>
    </LanguageProvider>
  );
}
