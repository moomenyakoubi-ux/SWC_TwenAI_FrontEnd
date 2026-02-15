import React, { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'react-native-calendars';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import WebSidebar, { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';
import { searchFlights } from '../services/flightsApi';

const backgroundImage = require('../images/image1.png');

const AIRPORTS_BY_COUNTRY = {
  IT: [
    { label: 'Roma (FCO)', value: 'FCO' },
    { label: 'Milano (MXP)', value: 'MXP' },
    { label: 'Napoli (NAP)', value: 'NAP' },
    { label: 'Bologna (BLQ)', value: 'BLQ' },
    { label: 'Venezia (VCE)', value: 'VCE' },
  ],
  TN: [
    { label: 'Tunisi (TUN)', value: 'TUN' },
    { label: 'Monastir (MIR)', value: 'MIR' },
    { label: 'Djerba (DJE)', value: 'DJE' },
    { label: 'Sfax (SFA)', value: 'SFA' },
  ],
};

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  EMPTY: 'empty',
  ERROR: 'error',
};

const TravelScreen = ({ navigation }) => {
  const { strings, isRTL } = useLanguage();
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const travelStrings = strings.travel;
  const menuStrings = strings.menu;
  const sidebarTitle = strings.home?.greeting || travelStrings.title;
  const [departureCountry, setDepartureCountry] = useState('IT');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pickerState, setPickerState] = useState({ visible: false, type: 'departure', date: new Date() });
  const [originIata, setOriginIata] = useState(AIRPORTS_BY_COUNTRY.IT[0]?.value || '');
  const [destinationIata, setDestinationIata] = useState(AIRPORTS_BY_COUNTRY.TN[0]?.value || '');
  const [maxStops, setMaxStops] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [status, setStatus] = useState(STATUS.IDLE);
  const [results, setResults] = useState([]);
  const [formError, setFormError] = useState('');
  const [requestError, setRequestError] = useState('');

  const destinationCountry = departureCountry === 'IT' ? 'TN' : 'IT';
  const originOptions = AIRPORTS_BY_COUNTRY[departureCountry] || [];
  const destinationOptions = AIRPORTS_BY_COUNTRY[destinationCountry] || [];

  useEffect(() => {
    setOriginIata(originOptions[0]?.value || '');
    setDestinationIata(destinationOptions[0]?.value || '');
  }, [departureCountry]);

  useEffect(() => {
    if (status === STATUS.LOADING) return;
    setStatus(STATUS.IDLE);
    setResults([]);
    setFormError('');
    setRequestError('');
  }, [departureCountry, originIata, destinationIata, departureDate, returnDate, maxStops, sortOrder]);

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

  const toIsoDate = (value) => {
    if (!value) return '';
    const [day, month, year] = value.split('-');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const formatIsoToDisplay = (value) => {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (!day || !month || !year) return value;
    return `${day}-${month}-${year}`;
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
      <Modal
        transparent
        animationType="fade"
        visible
        onRequestClose={() => setPickerState((prev) => ({ ...prev, visible: false }))}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerState((prev) => ({ ...prev, visible: false }))}>
          <Pressable style={styles.modalInner}>{pickerContent}</Pressable>
        </Pressable>
      </Modal>
    );
  };

  const requestPayload = useMemo(() => {
    return {
      originCountry: departureCountry,
      originIata,
      destinationCountry,
      destinationIata,
      departureDate: toIsoDate(departureDate),
      returnDate: returnDate ? toIsoDate(returnDate) : null,
      maxStops: maxStops ?? null,
      sortBy: 'price',
      sortOrder,
      adults: 1,
      currency: 'EUR',
    };
  }, [
    departureCountry,
    destinationCountry,
    originIata,
    destinationIata,
    departureDate,
    returnDate,
    maxStops,
    sortOrder,
  ]);

  const countryOptions = [
    { value: 'TN', label: travelStrings.tunisia },
    { value: 'IT', label: travelStrings.italy },
  ];

  const stopsOptions = [
    { key: 'any', value: null, label: travelStrings.anyStops },
    { key: '0', value: 0, label: '0' },
    { key: '1', value: 1, label: '1' },
    { key: '2', value: 2, label: '2' },
  ];

  const sortOptions = [
    { key: 'asc', value: 'asc', label: travelStrings.priceAsc },
    { key: 'desc', value: 'desc', label: travelStrings.priceDesc },
  ];

  const handleSearch = async () => {
    setFormError('');
    setRequestError('');

    if (!departureDate) {
      setFormError(travelStrings.departureDateRequired);
      return;
    }

    if (returnDate) {
      const departureValue = parseDateString(departureDate);
      const returnValue = parseDateString(returnDate);
      if (returnValue < departureValue) {
        setFormError(travelStrings.returnBeforeDeparture);
        return;
      }
    }

    console.log('[FlightSearchRequest]', requestPayload);
    setStatus(STATUS.LOADING);

    try {
      const data = await searchFlights(requestPayload);
      setResults(data || []);
      setStatus((data || []).length ? STATUS.SUCCESS : STATUS.EMPTY);
    } catch (error) {
      setRequestError(error?.message || travelStrings.errorState);
      setStatus(STATUS.ERROR);
    }
  };

  const renderSegmentedControl = (options, selectedValue, onSelect) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.segmentRow, isRTL && styles.segmentRowRtl]}
    >
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <Pressable
            key={option.key || option.value}
            onPress={() => onSelect(option.value)}
            style={[styles.segment, isSelected && styles.segmentSelected, isRTL && styles.segmentRtl]}
          >
            <Text style={[styles.segmentLabel, isSelected && styles.segmentLabelSelected, isRTL && styles.rtlText]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderTrip = ({ item }) => {
    const firstSegment = item.segments?.[0];
    const lastSegment = item.segments?.[item.segments.length - 1];
    const origin = firstSegment?.fromIata || originIata;
    const destination = lastSegment?.toIata || destinationIata;
    const routeTitle = `${origin} → ${destination}`;
    const subtitle = `${travelStrings.departingFrom} ${departureCountry === 'IT' ? travelStrings.italy : travelStrings.tunisia}`;
    const descriptionLines = [
      `${travelStrings.departureLabel}: ${item.outboundDate ? formatIsoToDisplay(item.outboundDate) : '--'}`,
    ];
    if (item.returnDate) {
      descriptionLines.push(`${travelStrings.returnLabel}: ${formatIsoToDisplay(item.returnDate)}`);
    }
    descriptionLines.push(`${travelStrings.stopsLabel}: ${item.stops} • ${item.durationMinutes} min`);
    const footer = `${item.price} ${item.currency}`;

    return <Card title={routeTitle} subtitle={subtitle} description={descriptionLines.join('\n')} footer={footer} isRTL={isRTL} />;
  };

  const renderStatusState = () => {
    if (status === STATUS.LOADING) {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.statusText, isRTL && styles.rtlText]}>{travelStrings.loadingState}</Text>
        </View>
      );
    }

    if (status === STATUS.ERROR) {
      return (
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, isRTL && styles.rtlText]}>{requestError || travelStrings.errorState}</Text>
          <Pressable style={styles.retryButton} onPress={handleSearch}>
            <Text style={styles.retryLabel}>{travelStrings.retryLabel}</Text>
          </Pressable>
        </View>
      );
    }

    if (status === STATUS.EMPTY) {
      return <Text style={[styles.emptyState, isRTL && styles.rtlText]}>{travelStrings.emptyState}</Text>;
    }

    return <Text style={[styles.emptyState, isRTL && styles.rtlText]}>{travelStrings.idleState}</Text>;
  };

  const isSearching = status === STATUS.LOADING;

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
            data={status === STATUS.SUCCESS ? results : []}
            keyExtractor={(item) => item.id}
            renderItem={renderTrip}
            contentContainerStyle={[styles.list, isWeb && styles.webList]}
            ListHeaderComponent={
              <View style={[styles.filtersContainer, isWeb && styles.filtersWeb]}>
                <Text style={[styles.heading, isRTL && styles.rtlText]}>{travelStrings.searchTitle}</Text>
                <Text style={[styles.subtitle, isRTL && styles.rtlText]}>{travelStrings.searchSubtitle}</Text>

                <Text style={[styles.label, isRTL && styles.rtlText]}>{travelStrings.departureCountryLabel}</Text>
                {renderSegmentedControl(countryOptions, departureCountry, setDepartureCountry)}

                <Text style={[styles.label, isRTL && styles.rtlText]}>{travelStrings.originCityLabel}</Text>
                {renderSegmentedControl(originOptions, originIata, setOriginIata)}

                <Text style={[styles.label, isRTL && styles.rtlText]}>{travelStrings.destinationCityLabel}</Text>
                {renderSegmentedControl(destinationOptions, destinationIata, setDestinationIata)}

                <Text style={[styles.label, isRTL && styles.rtlText]}>{travelStrings.departureDateLabel}</Text>
                <TextInput
                  style={[styles.input, isRTL && styles.inputRtl]}
                  placeholder={travelStrings.datePlaceholder}
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

                <Text style={[styles.label, isRTL && styles.rtlText]}>{travelStrings.stopsLabel}</Text>
                {renderSegmentedControl(stopsOptions, maxStops, setMaxStops)}

                <Text style={[styles.label, isRTL && styles.rtlText]}>{travelStrings.sortLabel}</Text>
                {renderSegmentedControl(sortOptions, sortOrder, setSortOrder)}

                <Text style={[styles.helper, isRTL && styles.rtlText]}>{travelStrings.filterHint}</Text>

                {formError ? <Text style={[styles.formError, isRTL && styles.rtlText]}>{formError}</Text> : null}

                <Pressable
                  style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
                  onPress={handleSearch}
                  disabled={isSearching}
                >
                  <Text style={styles.searchLabel}>{travelStrings.searchButton}</Text>
                </Pressable>

                <Text style={[styles.resultsTitle, isRTL && styles.rtlText]}>{travelStrings.resultsTitle}</Text>
              </View>
            }
            ListEmptyComponent={renderStatusState}
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
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  segmentRowRtl: {
    flexDirection: 'row-reverse',
  },
  segment: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.muted,
    color: theme.colors.text,
    backgroundColor: theme.colors.card,
    marginRight: theme.spacing.sm,
  },
  segmentRtl: {
    marginRight: 0,
    marginLeft: theme.spacing.sm,
  },
  segmentSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  segmentLabel: {
    color: theme.colors.text,
  },
  segmentLabelSelected: {
    color: theme.colors.card,
    fontWeight: '700',
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
  formError: {
    fontSize: 13,
    color: theme.colors.primary,
  },
  searchButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: theme.spacing.xs,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchLabel: {
    color: theme.colors.card,
    fontWeight: '700',
    fontSize: 16,
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
  statusContainer: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  retryLabel: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default TravelScreen;
