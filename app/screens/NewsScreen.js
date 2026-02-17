import React, { useMemo } from 'react';
import { FlatList, ImageBackground, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import fakeEvents from '../data/fakeEvents';
import fakeNews from '../data/fakeNews';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import WebSidebar, { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';

const backgroundImage = require('../images/image1.png');

const NewsScreen = ({ navigation }) => {
  const isWeb = Platform.OS === 'web';
  const { strings, isRTL } = useLanguage();
  const newsStrings = strings.news;
  const menuStrings = strings.menu;
  const sidebarTitle = strings.home?.greeting || newsStrings.title;
  const unifiedFeed = useMemo(
    () => [
      { id: 'section-events', itemType: 'section', title: newsStrings.eventsSection },
      ...fakeEvents.map((item) => ({ ...item, itemType: 'event' })),
      { id: 'section-news', itemType: 'section', title: newsStrings.newsSection },
      ...fakeNews.map((item) => ({ ...item, itemType: 'news' })),
    ],
    [newsStrings.eventsSection, newsStrings.newsSection],
  );

  return (
    <ImageBackground
      source={backgroundImage}
      defaultSource={backgroundImage}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
          <View style={styles.container}>
            <FlatList
              data={unifiedFeed}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={(
                <View style={styles.pageHeader}>
                  <Text style={[styles.pageTitle, isRTL && styles.rtlText]}>{newsStrings.title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                item.itemType === 'section' ? (
                  <SectionHeader title={item.title} isRTL={isRTL} />
                ) : (
                  <Card
                    title={item.title}
                    description={item.description}
                    image={item.image}
                    subtitle={item.itemType === 'event' ? `${item.city} • ${item.date}` : newsStrings.category}
                    isRTL={isRTL}
                  />
                )
              )}
              contentContainerStyle={[styles.list, isWeb && styles.webList]}
              showsVerticalScrollIndicator={false}
            />
          </View>
          <WebSidebar
            title={sidebarTitle}
            menuStrings={menuStrings}
            navigation={navigation}
            isRTL={isRTL}
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  overlayWeb: {
    paddingLeft: WEB_TAB_BAR_WIDTH,
  },
  backgroundImage: {
    resizeMode: 'cover',
    alignSelf: 'center',
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  pageHeader: {
    marginBottom: theme.spacing.xs,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.secondary,
    marginBottom: theme.spacing.md,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  webList: {
    paddingRight: theme.spacing.lg + WEB_SIDE_MENU_WIDTH,
    paddingLeft: theme.spacing.lg + WEB_TAB_BAR_WIDTH,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default NewsScreen;
