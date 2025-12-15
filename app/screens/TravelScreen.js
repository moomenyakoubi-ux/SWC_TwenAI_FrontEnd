import React, { useMemo, useState } from 'react';
import { Calendar } from 'react-native-calendars';
import {
  FlatList,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import fakeTravel from '../data/fakeTravel';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import WebSidebar, { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';

const backgroundImage = require('../images/image1.png');

const TravelScreen = ({ navigation }) => {
  const { strings, isRTL } = useLanguage();
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const travelStrings = strings.travel;
  const menuStrings = strings.menu;
  const sidebarTitle = strings.home?.greeting || travelStrings.title;
  const [departureCountry, setDepartureCountry] = useState('Italia');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pickerState, setPickerState] = useState({ visible: false, type: 'departure', date: new Date() });

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const parseDateString = (value) => {
    const [day, month, year] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const updateDate = (type, date) => {
    const formatted = formatDate(date);
    if (type === 'departure') {
      setDepartureDate(formatted);
    } else {
      setReturnDate(formatted);
    }
  };

  const openDatePicker = (type) => {
    const existingValue =
      type === 'departure'
        ? departureDate
        : type === 'return'
          ? returnDate
          : '';
    const initialDate = existingValue ? parseDateString(existingValue) : new Date();
    setPickerState({ visible: true, type, date: initialDate });
  };

  const handleDateSelection = (selectedValue) => {
    if (!selectedValue) return;
    const [year, month, day] = selectedValue.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    updateDate(pickerState.type, selectedDate);
    setPickerState((prev) => ({ ...prev, date: selectedDate, visible: false }));
  };

  const renderPickerOverlay = () => {
    if (!pickerState.visible) return null;

    const pickerDateValue = pickerState.date.toISOString().split('T')[0];
    const pickerContent = (
      <View style={styles.pickerCard}>
        <Calendar
          current={pickerDateValue}
          onDayPress={(day) => handleDateSelection(day.dateString)}
          markedDates={{
            [pickerDateValue]: {
              selected: true,
              selectedColor: theme.colors.primary,
              selectedTextColor: '#000000',
            },
          }}
          theme={{
            calendarBackground: theme.colors.card,
            textSectionTitleColor: '#000000',
            dayTextColor: '#000000',
            todayTextColor: theme.colors.primary,
            monthTextColor: '#000000',
            textDisabledColor: '#666666',
            arrowColor: theme.colors.primary,
          }}
        />
        <Pressable style={styles.pickerClose} onPress={() => setPickerState((prev) => ({ ...prev, visible: false }))}>
          <Text style={styles.pickerCloseLabel}>OK</Text>
        </Pressable>
      </View>
    );

    if (Platform.OS === 'web') {
      return <View style={styles.webPickerOverlay}>{pickerContent}</View>;
    }

    return (
      <Modal transparent animationType="fade" visible onRequestClose={() => setPickerState((prev) => ({ ...prev, visible: false }))}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerState((prev) => ({ ...prev, visible: false }))}>
          <Pressable style={styles.modalInner}>{pickerContent}</Pressable>
        </Pressable>
      </Modal>
    );
  };

  const filteredTrips = useMemo(
    () =>
      fakeTravel.filter((trip) => {
        if (trip.departureCountry !== departureCountry) return false;
        if (departureDate && trip.departureDate !== departureDate) return false;
        if (returnDate && trip.returnDate !== returnDate) return false;
        return true;
      }),
    [departureCountry, departureDate, returnDate],
  );

  const countryOptions = [
    { value: 'Tunisia', label: travelStrings.tunisia },
    { value: 'Italia', label: travelStrings.italy },
  ];

  const renderTrip = ({ item }) => {
    const routeTitle = `${item.departureCity} ${item.mode === 'Navale' ? '⛴' : '✈'} ${item.arrivalCity}`;
    const subtitle = `${travelStrings.departingFrom} ${
      item.departureCountry === 'Italia' ? travelStrings.italy : travelStrings.tunisia
    }`;
    const description = `${travelStrings.departureLabel}: ${item.departureDate}${
      item.returnDate ? ` • ${travelStrings.returnLabel}: ${item.returnDate}` : ''
    }\n${travelStrings.operatorLabel}: ${item.operator}`;
    const footer = `${item.mode === 'Navale' ? travelStrings.sea : travelStrings.flight} • ${item.notes}`;

    return <Card title={routeTitle} subtitle={subtitle} description={description} footer={footer} isRTL={isRTL} />;
  };

  return (
    <ImageBackground
      source={backgroundImage}
      defaultSource={backgroundImage}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
          <Navbar title={travelStrings.title} isRTL={isRTL} />
          <FlatList
            data={filteredTrips}
            keyExtractor={(item) => item.id}
            renderItem={renderTrip}
            contentContainerStyle={[styles.list, isWeb && styles.webList]}
            ListHeaderComponent={
              <View style={[styles.filtersContainer, isWeb && styles.filtersWeb]}>
                <Text style={[styles.heading, isRTL && styles.rtlText]}>{travelStrings.searchTitle}</Text>
                <Text style={[styles.subtitle, isRTL && styles.rtlText]}>{travelStrings.searchSubtitle}</Text>

                <Text style={[styles.label, isRTL && styles.rtlText]}>{travelStrings.departureCountryLabel}</Text>
                <View style={[styles.countryRow, isRTL && styles.countryRowRtl]}>
                  {countryOptions.map((option) => (
                    <Text
                      key={option.value}
                      onPress={() => setDepartureCountry(option.value)}
                      style={[
                        styles.chip,
                        departureCountry === option.value && styles.chipSelected,
                        isRTL && styles.rtlText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  ))}
                </View>

                <Text style={[styles.label, isRTL && styles.rtlText]}>{travelStrings.departureDateLabel}</Text>
                <TextInput
                  style={[styles.input, isRTL && styles.inputRtl]}
                  placeholder={`${travelStrings.datePlaceholder} (${travelStrings.optionalLabel})`}
                  placeholderTextColor={theme.colors.muted}
                  value={departureDate}
                  onFocus={() => openDatePicker('departure')}
                  onPressIn={() => openDatePicker('departure')}
                  showSoftInputOnFocus={false}
                  caretHidden
                  editable={isAndroid}
                />

                <Text style={[styles.label, isRTL && styles.rtlText]}>{travelStrings.returnDateLabel}</Text>
                <TextInput
                  style={[styles.input, isRTL && styles.inputRtl]}
                  placeholder={`${travelStrings.datePlaceholder} (${travelStrings.optionalLabel})`}
                  placeholderTextColor={theme.colors.muted}
                  value={returnDate}
                  onFocus={() => openDatePicker('return')}
                  onPressIn={() => openDatePicker('return')}
                  showSoftInputOnFocus={false}
                  caretHidden
                  editable={isAndroid}
                />

                {renderPickerOverlay()}

                <Text style={[styles.helper, isRTL && styles.rtlText]}>{travelStrings.filterHint}</Text>
                <Text style={[styles.resultsTitle, isRTL && styles.rtlText]}>{travelStrings.resultsTitle}</Text>
              </View>
            }
            ListEmptyComponent={
              <Text style={[styles.emptyState, isRTL && styles.rtlText]}>{travelStrings.emptyState}</Text>
            }
            showsVerticalScrollIndicator={false}
          />
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
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  webList: {
    paddingRight: theme.spacing.lg + WEB_SIDE_MENU_WIDTH,
    paddingLeft: theme.spacing.lg + WEB_TAB_BAR_WIDTH,
  },
  filtersContainer: {
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filtersWeb: {
    paddingHorizontal: theme.spacing.xl,
    maxWidth: 980,
    width: '100%',
    alignSelf: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.muted,
    lineHeight: 20,
  },
  label: {
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  countryRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  countryRowRtl: {
    flexDirection: 'row-reverse',
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.muted,
    color: theme.colors.text,
    backgroundColor: theme.colors.card,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    color: theme.colors.card,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
  },
  inputRtl: {
    textAlign: 'right',
  },
  helper: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalInner: {
    width: '100%',
    maxWidth: 420,
  },
  pickerCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  pickerClose: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pickerCloseLabel: {
    fontWeight: '700',
    color: theme.colors.primary,
    fontSize: 16,
  },
  webPickerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    zIndex: 999,
  },
  resultsTitle: {
    marginTop: theme.spacing.md,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  emptyState: {
    marginTop: theme.spacing.lg,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default TravelScreen;
