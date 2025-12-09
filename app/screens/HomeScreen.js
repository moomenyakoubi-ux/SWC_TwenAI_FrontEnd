import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import PostCard from '../components/PostCard';
import fakeNews from '../data/fakeNews';
import fakeEvents from '../data/fakeEvents';
import fakePlaces from '../data/fakePlaces';
import fakePosts from '../data/fakePosts';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import { useContacts } from '../context/ContactsContext';
import { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';

const backgroundImage = require('../images/image1.png');

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const HomeScreen = ({ navigation }) => {
  const isWeb = Platform.OS === 'web';
  const { strings, isRTL } = useLanguage();
  const homeStrings = strings.home;
  const menuStrings = strings.menu;
  const [isMenuOpen, setIsMenuOpen] = useState(isWeb);
  const sideMenuWidth = isWeb ? WEB_SIDE_MENU_WIDTH : 280;
  const slideAnim = useRef(new Animated.Value(isWeb ? 1 : 0)).current;
  const { profiles } = useContacts();

  const selection = useMemo(
    () => ({
      news: pickRandom(fakeNews),
      event: pickRandom(fakeEvents),
      place: pickRandom(fakePlaces),
    }),
    [],
  );

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isMenuOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen, slideAnim]);

  return (
    <ImageBackground
      source={backgroundImage}
      defaultSource={backgroundImage}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        <View style={[styles.header, isRTL && styles.headerRtl]}>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, isRTL && styles.rtlText]}>{homeStrings.greeting}</Text>
            <Text style={[styles.subtitle, isRTL && styles.rtlText]}>{homeStrings.subtitle}</Text>
          </View>
          {!isWeb ? (
            <TouchableOpacity
              accessibilityLabel={menuStrings.language}
              style={styles.menuButton}
              onPress={() => setIsMenuOpen(true)}
            >
              <Ionicons name="menu" size={26} color={theme.colors.card} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isWeb && { paddingRight: sideMenuWidth + theme.spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
        >
          
          <SectionHeader title={homeStrings.featuredNews} isRTL={isRTL} />
          <Card
            title={selection.news.title}
            description={selection.news.description}
            image={selection.news.image}
            subtitle={strings.news.category}
            isRTL={isRTL}
          />

          <SectionHeader title={homeStrings.culturalEvents} isRTL={isRTL} />
          <Card
            title={selection.event.title}
            description={selection.event.description}
            image={selection.event.image}
            subtitle={`${selection.event.city} • ${selection.event.date}`}
            isRTL={isRTL}
          />

          <SectionHeader title={homeStrings.places} isRTL={isRTL} />
          <Card
            title={selection.place.name}
            description={selection.place.description}
            image={selection.place.image}
            subtitle={`${selection.place.type} • ${selection.place.address}`}
            isRTL={isRTL}
          />

          <SectionHeader title={homeStrings.communityPosts} isRTL={isRTL} />
          {fakePosts
            .filter((post) => {
              const profile = profiles.find(
                (item) => item.handle === post.handle || item.username === post.handle || item.name === post.author,
              );
              return profile?.isContact;
            })
            .map((post) => {
              const profile = profiles.find(
                (item) => item.handle === post.handle || item.username === post.handle || item.name === post.author,
              );

              return (
                <PostCard
                  key={post.id}
                  post={post}
                  isRTL={isRTL}
                  onPressAuthor={
                    profile ? () => navigation.navigate('PublicProfile', { profileId: profile.id }) : undefined
                  }
                />
              );
            })}

        </ScrollView>

        {isMenuOpen && !isWeb && (
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setIsMenuOpen(false)} />
        )}
        <Animated.View
          style={[
            styles.sideMenu,
            { width: sideMenuWidth },
            {
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sideMenuWidth, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.menuTitle, isRTL && styles.rtlText]}>{homeStrings.greeting}</Text>
          <View style={styles.menuItems}>
            {[
              { label: menuStrings.addContact, icon: 'person-add', route: 'AddContact' },
              { label: menuStrings.accountSettings, icon: 'settings', route: 'AccountSettings' },
              { label: menuStrings.language, icon: 'globe', route: 'Lingua' },
              { label: menuStrings.privacy, icon: 'shield-checkmark', route: 'PrivacyPolicy' },
              { label: menuStrings.terms, icon: 'document-text', route: 'Termini' },
              { label: menuStrings.copyright, icon: 'ribbon', route: 'Copyright' },
              { label: menuStrings.cookies, icon: 'ice-cream', route: 'CookiePolicy' },
              { label: menuStrings.aiUsage, icon: 'sparkles', route: 'AiUsage' },
              { label: menuStrings.support, icon: 'call', route: 'Support' },
            ].map((item) => (
            <TouchableOpacity
              key={item.route}
                style={[styles.menuItem, isRTL && styles.menuItemRtl]}
                onPress={() => {
                  if (!isWeb) {
                    setIsMenuOpen(false);
                  }
                  navigation.navigate(item.route);
                }}
              >
                <Ionicons name={item.icon} size={22} color={theme.colors.secondary} />
                <Text style={[styles.menuLabel, isRTL && styles.rtlText]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
    resizeMode: 'cover',
    alignSelf: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 27, 51, 0.6)',
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl + theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  headerText: {
    flex: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl + 40,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.card,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.card,
    opacity: 0.9,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 280,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl + theme.spacing.sm,
    backgroundColor: theme.colors.card,
    ...theme.shadow.card,
    gap: theme.spacing.lg,
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: Platform.OS === 'android' ? theme.spacing.sm : 0,
  },
  menuItems: {
    gap: theme.spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  menuItemRtl: {
    flexDirection: 'row-reverse',
  },
  menuLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
});

export default HomeScreen;
