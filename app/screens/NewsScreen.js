import React from 'react';
import { FlatList, ImageBackground, Platform, SafeAreaView, StyleSheet, View } from 'react-native';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import fakeNews from '../data/fakeNews';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import WebSidebar, { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';

const backgroundImage = require('../images/image1.png');

const NewsScreen = ({ navigation }) => {
  const isWeb = Platform.OS === 'web';
  const { strings, isRTL } = useLanguage();
  const newsStrings = strings.news;
  const menuStrings = strings.menu;
  const sidebarTitle = strings.home?.greeting || newsStrings.title;

  return (
    <ImageBackground
      source={backgroundImage}
      defaultSource={backgroundImage}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.overlay}>
          <Navbar title={newsStrings.title} isRTL={isRTL} />
          <View style={styles.container}>
            <FlatList
              data={fakeNews}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Card
                  title={item.title}
                  description={item.description}
                  image={item.image}
                  subtitle={newsStrings.category}
                  isRTL={isRTL}
                />
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
  list: {
    paddingBottom: theme.spacing.xl,
  },
  webList: {
    paddingRight: theme.spacing.lg + WEB_SIDE_MENU_WIDTH,
  },
});

export default NewsScreen;
