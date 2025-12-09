import React, { useMemo, useState } from 'react';
import { FlatList, ImageBackground, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import fakeEvents from '../data/fakeEvents';
import fakePlaces from '../data/fakePlaces';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import WebSidebar, { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';

const backgroundImage = require('../images/image1.png');

const tabs = ['events', 'places'];

const ExperiencesScreen = ({ navigation }) => {
  const isWeb = Platform.OS === 'web';
  const { strings, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('events');
  const experiencesStrings = strings.experiences || strings.events;
  const menuStrings = strings.menu;
  const sidebarTitle = strings.home?.greeting || experiencesStrings.title;

  const data = useMemo(() => (activeTab === 'events' ? fakeEvents : fakePlaces), [activeTab]);

  return (
    <ImageBackground
      source={backgroundImage}
      defaultSource={backgroundImage}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.overlay}>
          <Navbar title={experiencesStrings.title} isRTL={isRTL} />
          <View style={[styles.container, isWeb && styles.webContainer]}>
            <View style={[styles.tabRow, isRTL && styles.rowReverse]}>
              {tabs.map((tabKey) => (
                <TouchableOpacity
                  key={tabKey}
                  style={[styles.tab, activeTab === tabKey && styles.activeTab]}
                  onPress={() => setActiveTab(tabKey)}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      activeTab === tabKey && styles.activeTabLabel,
                      isRTL && styles.rtlText,
                    ]}
                  >
                    {tabKey === 'events' ? experiencesStrings.eventsTab : experiencesStrings.placesTab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={data}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Card
                  title={item.title || item.name}
                  description={item.description}
                  image={item.image}
                  subtitle={
                    activeTab === 'events'
                      ? `${item.city} • ${item.date}`
                      : `${item.type} • ${item.address}`
                  }
                  isRTL={isRTL}
                />
              )}
              contentContainerStyle={[styles.list, isWeb && styles.webList]}
              showsVerticalScrollIndicator={false}
            />
            <WebSidebar
              title={sidebarTitle}
              menuStrings={menuStrings}
              navigation={navigation}
              isRTL={isRTL}
            />
          </View>
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
  backgroundImage: {
    resizeMode: 'cover',
    alignSelf: 'center',
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  webContainer: {
    paddingRight: theme.spacing.lg + WEB_SIDE_MENU_WIDTH,
  },
  list: {
    paddingBottom: theme.spacing.xl,
  },
  webList: {
    paddingRight: theme.spacing.lg + WEB_SIDE_MENU_WIDTH,
  },
  tabRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(12, 27, 51, 0.05)',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: theme.colors.secondary,
  },
  tabLabel: {
    color: theme.colors.secondary,
    fontWeight: '700',
  },
  activeTabLabel: {
    color: theme.colors.card,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default ExperiencesScreen;
