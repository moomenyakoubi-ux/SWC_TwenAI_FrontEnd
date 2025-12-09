import React from 'react';
import { FlatList, ImageBackground, SafeAreaView, StyleSheet, View } from 'react-native';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import fakeEvents from '../data/fakeEvents';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';

const backgroundImage = require('../images/image1.png');

const EventsScreen = () => {
  const { strings, isRTL } = useLanguage();
  const eventsStrings = strings.events;

  return (
    <ImageBackground
      source={backgroundImage}
      defaultSource={backgroundImage}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.overlay}>
          <Navbar title={eventsStrings.title} isRTL={isRTL} />
          <View style={styles.container}>
            <FlatList
              data={fakeEvents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Card
                  title={item.title}
                  description={item.description}
                  image={item.image}
                  subtitle={`${item.city} • ${item.date}`}
                  isRTL={isRTL}
                />
              )}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
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
  list: {
    paddingBottom: theme.spacing.xl,
  },
});

export default EventsScreen;
