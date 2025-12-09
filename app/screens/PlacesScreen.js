import React from 'react';
import { FlatList, ImageBackground, SafeAreaView, StyleSheet, View } from 'react-native';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import fakePlaces from '../data/fakePlaces';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';

const backgroundImage = require('../images/image1.PNG');

const PlacesScreen = () => {
  const { strings, isRTL } = useLanguage();
  const placesStrings = strings.places;

  return (
    <ImageBackground
      source={backgroundImage}
      defaultSource={backgroundImage}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.overlay}>
          <Navbar title={placesStrings.title} isRTL={isRTL} />
          <View style={styles.container}>
            <FlatList
              data={fakePlaces}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Card
                  title={item.name}
                  description={item.description}
                  image={item.image}
                  subtitle={`${item.type} • ${item.address}`}
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

export default PlacesScreen;
