import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StatusBar, View } from 'react-native';
import { NavigationContainer, DefaultTheme as NavigationTheme, createNavigationContainerRef } from '@react-navigation/native';
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
import WebSidebar from './app/components/WebSidebar';
import AuthScreen from './app/screens/AuthScreen';
import ForgotPasswordScreen from './app/screens/ForgotPasswordScreen';
import UpdatePasswordScreen from './app/screens/UpdatePasswordScreen';
import useSession from './app/auth/useSession';
import useProfile from './app/profile/useProfile';
import ErrorBoundary from './app/components/ErrorBoundary';

const sharedBackgroundAsset = require('./app/images/image1.png');
const chatBackgroundAsset = require('./app/images/image2.png');

const Tab = createBottomTabNavigator();
const AUTH_ROUTES = {
  login: 'login',
  forgot: 'forgot',
  update: 'update',
};

const getAuthRouteFromPath = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return AUTH_ROUTES.login;
  if (window.location.pathname === '/auth/update-password') return AUTH_ROUTES.update;
  return AUTH_ROUTES.login;
};

const replaceAuthPath = (route) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const nextPath = route === AUTH_ROUTES.update ? '/auth/update-password' : '/';
  window.history.replaceState({}, '', nextPath);
};

const navigationTheme = {
  ...NavigationTheme,
  colors: {
    ...NavigationTheme.colors,
    background: theme.colors.background,
    primary: theme.colors.primary,
    text: theme.colors.text,
  },
};

// Keep a navigation ref for non-screen components (e.g., web sidebar).
const navigationRef = createNavigationContainerRef();

const AppTabs = ({ navigation }) => {
  const { strings, isRTL } = useLanguage();
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

  const sidebarTitle = strings.home?.greeting || strings.menu?.userProfile;

  return (
    <>
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
        options={{ tabBarLabel: strings.menu.userProfile, ...hiddenTabOptions }}
      >
        {(props) => (
          <ErrorBoundary onBack={() => props.navigation.goBack()}>
            <PublicProfileScreen {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>
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
      <WebSidebar
        title={sidebarTitle}
        menuStrings={strings.menu}
        navigation={navigation}
        isRTL={isRTL}
      />
    </>
  );
};

const MainApp = () => (
  <NavigationContainer ref={navigationRef} theme={navigationTheme}>
    <StatusBar barStyle="light-content" />
    <AppTabs navigation={navigationRef} />
  </NavigationContainer>
);

const AuthFlow = ({ session }) => {
  const [route, setRoute] = useState(getAuthRouteFromPath);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const handlePopState = () => setRoute(getAuthRouteFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (nextRoute) => {
    setRoute(nextRoute);
    replaceAuthPath(nextRoute);
  };

  if (route === AUTH_ROUTES.update) {
    return <UpdatePasswordScreen session={session} onBackToLogin={() => navigate(AUTH_ROUTES.login)} />;
  }

  if (route === AUTH_ROUTES.forgot) {
    return <ForgotPasswordScreen onBackToLogin={() => navigate(AUTH_ROUTES.login)} />;
  }

  return <AuthScreen onForgotPassword={() => navigate(AUTH_ROUTES.forgot)} />;
};

const ProfileLanguageSync = () => {
  const { profile } = useProfile();
  const { language, setLanguage, hasStoredLanguage } = useLanguage();
  const hasSyncedLanguage = React.useRef(false);

  useEffect(() => {
    if (!profile?.language) return;
    if (hasStoredLanguage) return;
    if (hasSyncedLanguage.current) return;
    const normalizedProfileLanguage = String(profile.language).trim().toLowerCase();
    if (!['it', 'ar'].includes(normalizedProfileLanguage)) return;
    hasSyncedLanguage.current = true;
    if (normalizedProfileLanguage === language) return;
    setLanguage(normalizedProfileLanguage);
  }, [hasStoredLanguage, language, profile?.language, setLanguage]);

  return null;
};

const AppContent = () => {
  const { user, loading, session } = useSession();
  const isUpdatePasswordPath = getAuthRouteFromPath() === AUTH_ROUTES.update;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      </View>
    );
  }

  if (!user || isUpdatePasswordPath) {
    return <AuthFlow session={session} />;
  }

  return (
    <>
      <ProfileLanguageSync />
      <MainApp />
    </>
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
          <AppContent />
        </PostsProvider>
      </ContactsProvider>
    </LanguageProvider>
  );
}
