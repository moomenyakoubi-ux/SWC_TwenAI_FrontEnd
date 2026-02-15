import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar } from 'react-native-calendars';
import {
  ActivityIndicator,
  Dimensions,
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

const CARRIER_NAMES = {
  TU: 'Tunisair',
  AF: 'Air France',
  AZ: 'ITA Airways',
  A3: 'Aegean Airlines',
  FR: 'Ryanair',
  U2: 'easyJet',
  KL: 'KLM',
  LH: 'Lufthansa',
  OS: 'Austrian',
  SN: 'Brussels Airlines',
};

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  EMPTY: 'empty',
  ERROR: 'error',
};

const DropdownTab = React.forwardRef(({ label, value, isOpen, onPress, isRTL }, ref) => (
  <Pressable
    ref={ref}
    collapsable={false}
    onPress={onPress}
    style={[styles.dropdownTab, isOpen && styles.dropdownTabOpen, isRTL && styles.dropdownTabRtl]}
  >
    <View style={[styles.dropdownTabContent, isRTL && styles.dropdownTabContentRtl]}>
      <Text style={[styles.dropdownTabText, isRTL && styles.rtlText]} numberOfLines={1}>
        {label}: {value}
      </Text>
      <Text style={styles.dropdownTabIcon}>{isOpen ? '▲' : '▼'}</Text>
    </View>
  </Pressable>
));

const TravelScreen = ({ navigation }) => {
  const { strings, isRTL } = useLanguage();
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const travelStrings = strings.travel;
  const menuStrings = strings.menu;
  const sidebarTitle = strings.home?.greeting || travelStrings.title;
  const tabRefs = useRef({
    origin: React.createRef(),
    destination: React.createRef(),
    stops: React.createRef(),
    price: React.createRef(),
  });
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
  const [openDropdown, setOpenDropdown] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [dirtyFilters, setDirtyFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const destinationCountry = departureCountry === 'IT' ? 'TN' : 'IT';
  const originOptions = AIRPORTS_BY_COUNTRY[departureCountry] || [];
  const destinationOptions = AIRPORTS_BY_COUNTRY[destinationCountry] || [];

  useEffect(() => {
    const originValues = originOptions.map((option) => option.value);
    const destinationValues = destinationOptions.map((option) => option.value);

    if (!originValues.includes(originIata)) {
      setOriginIata(originOptions[0]?.value || '');
    }

    if (!destinationValues.includes(destinationIata)) {
      setDestinationIata(destinationOptions[0]?.value || '');
    }

    setOpenDropdown(null);
  }, [departureCountry, originOptions, destinationOptions, originIata, destinationIata]);

  useEffect(() => {
    if (status === STATUS.LOADING) return;
    if (!results.length) {
      setStatus(STATUS.IDLE);
    }
    setFormError('');
    setRequestError('');
    if (hasSearched) {
      setDirtyFilters(true);
    }
  }, [departureCountry, originIata, destinationIata, departureDate, returnDate, maxStops, sortOrder, status, results.length, hasSearched]);

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

  const formatTime = (iso) => {
    if (!iso || typeof iso !== 'string') return '--';
    const directMatch = iso.match(/T(\d{2}):(\d{2})/);
    if (directMatch) {
      return `${directMatch[1]}:${directMatch[2]}`;
    }
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '--';
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDuration = (minutes) => {
    const totalMinutes = Math.floor(Number(minutes));
    if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '--';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const formatStops = (value) => {
    const stops = Math.floor(Number(value));
    if (!Number.isFinite(stops) || stops < 0) return '--';
    if (stops === 0) return 'Diretto';
    if (stops === 1) return '1 scalo';
    if (stops === 2) return '2 scali';
    return '3+ scali';
  };

  const formatPrice = (priceObj) => {
    if (!priceObj || typeof priceObj !== 'object') return '--';
    const total = Number(priceObj.total);
    const currency = typeof priceObj.currency === 'string' ? priceObj.currency.toUpperCase() : '';
    if (!Number.isFinite(total) || !currency) return '--';
    if (currency === 'EUR') {
      return `${total.toFixed(2).replace('.', ',')} €`;
    }
    return `${total.toFixed(2)} ${currency}`;
  };

  const normalizeCarrierCode = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim().toUpperCase();
  };

  const getCarrierCodes = (offer) => {
    const addUniqueCode = (targetSet, codeValue) => {
      const code = normalizeCarrierCode(codeValue);
      if (code) {
        targetSet.add(code);
      }
    };

    const metaCarriers = Array.isArray(offer?.meta?.carriers) ? offer.meta.carriers : [];
    const metaCodes = new Set();
    metaCarriers.forEach((code) => addUniqueCode(metaCodes, code));
    if (metaCodes.size > 0) {
      return Array.from(metaCodes);
    }

    const segmentCodes = new Set();
    const outboundSegments = Array.isArray(offer?.outbound?.segments) ? offer.outbound.segments : [];
    const inboundSegments = Array.isArray(offer?.inbound?.segments) ? offer.inbound.segments : [];
    [...outboundSegments, ...inboundSegments].forEach((segment) => addUniqueCode(segmentCodes, segment?.carrier));
    return Array.from(segmentCodes);
  };

  const formatCarrierLabel = (offer) => {
    const carrierCodes = getCarrierCodes(offer);
    if (!carrierCodes.length) return 'Compagnia: --';

    const visibleCodes = carrierCodes.slice(0, 3);
    const visibleCarriers = visibleCodes.map((code) => {
      const carrierName = CARRIER_NAMES[code];
      return carrierName ? `${carrierName} (${code})` : code;
    });

    const prefix = carrierCodes.length === 1 ? 'Compagnia' : 'Compagnie';
    const suffix = carrierCodes.length > 3 ? ', …' : '';
    return `${prefix}: ${visibleCarriers.join(', ')}${suffix}`;
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

  const getOptionLabel = (options, value, fallback = '') => {
    const match = options.find((option) => option.value === value);
    return match?.label || fallback;
  };

  const toggleDropdown = (key) => {
    if (openDropdown === key) {
      setOpenDropdown(null);
      setAnchor(null);
      return;
    }

    const ref = tabRefs.current?.[key]?.current;
    if (ref?.measureInWindow) {
      ref.measureInWindow((x, y, width, height) => {
        setAnchor({ x, y, w: width, h: height });
        setOpenDropdown(key);
      });
    } else {
      setAnchor(null);
      setOpenDropdown(key);
    }
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
    setAnchor(null);
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

  const originValueLabel = getOptionLabel(originOptions, originIata, '--');
  const destinationValueLabel = getOptionLabel(destinationOptions, destinationIata, '--');
  const stopsValueLabel = getOptionLabel(stopsOptions, maxStops ?? null, travelStrings.anyStops);
  const priceValueLabel = sortOrder === 'asc' ? '↑' : '↓';

  const dropdownTabs = [
    {
      key: 'origin',
      label: travelStrings.originTabLabel,
      value: originValueLabel,
      options: originOptions,
      selectedValue: originIata,
      onSelect: setOriginIata,
    },
    {
      key: 'destination',
      label: travelStrings.destinationTabLabel,
      value: destinationValueLabel,
      options: destinationOptions,
      selectedValue: destinationIata,
      onSelect: setDestinationIata,
    },
    {
      key: 'stops',
      label: travelStrings.stopsTabLabel,
      value: stopsValueLabel,
      options: stopsOptions,
      selectedValue: maxStops ?? null,
      onSelect: setMaxStops,
    },
    {
      key: 'price',
      label: travelStrings.priceTabLabel,
      value: priceValueLabel,
      options: sortOptions,
      selectedValue: sortOrder,
      onSelect: setSortOrder,
    },
  ];

  const activeDropdown = dropdownTabs.find((tab) => tab.key === openDropdown) || null;
  const windowDimensions = Dimensions.get('window');
  const dropdownRowHeight = 44;
  const dropdownPadding = theme.spacing.xs * 2;

  const getDropdownPanelStyle = () => {
    if (!anchor || !activeDropdown) return {};
    const maxWidth = Math.min(anchor.w * 1.4, 320);
    const menuHeight = activeDropdown.options.length * dropdownRowHeight + dropdownPadding;
    let top = anchor.y + anchor.h + 8;
    if (top + menuHeight > windowDimensions.height) {
      top = anchor.y - menuHeight - 8;
    }
    top = Math.max(8, top);
    let left = anchor.x;
    if (left + maxWidth > windowDimensions.width - theme.spacing.lg) {
      left = Math.max(theme.spacing.lg, windowDimensions.width - maxWidth - theme.spacing.lg);
    }
    return {
      top,
      left,
      minWidth: anchor.w,
      maxWidth,
    };
  };

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
    setHasSearched(true);
    setDirtyFilters(false);
    setOpenDropdown(null);
    setStatus(STATUS.LOADING);

    try {
      const data = await searchFlights(requestPayload);
      if (__DEV__ && data?.queryHash) {
        console.log('[FlightSearchQueryHash]', data.queryHash);
      }
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
    const outboundSegments = Array.isArray(item?.outbound?.segments) ? item.outbound.segments : [];
    const firstOutboundSegment = outboundSegments[0];
    const lastOutboundSegment = outboundSegments[outboundSegments.length - 1];
    const routeOrigin = firstOutboundSegment?.from || firstOutboundSegment?.fromIata || originIata || '--';
    const routeDestination = lastOutboundSegment?.to || lastOutboundSegment?.toIata || destinationIata || '--';

    const outboundTimes = `${formatTime(item?.outbound?.departure)} – ${formatTime(item?.outbound?.arrival)}`;
    const carrierLabel = formatCarrierLabel(item);
    const outboundInfo = `${formatStops(item?.outbound?.stops)} • Durata: ${formatDuration(item?.outbound?.durationMinutes)}`;
    const formattedPrice = formatPrice(item?.price);

    const hasInbound = Boolean(item?.inbound);
    const inboundTimes = `${formatTime(item?.inbound?.departure)} – ${formatTime(item?.inbound?.arrival)}`;
    const inboundInfo = `${formatStops(item?.inbound?.stops)} • Durata: ${formatDuration(item?.inbound?.durationMinutes)}`;

    return (
      <View style={styles.flightCard}>
        <Text style={[styles.flightRouteTitle, isRTL && styles.rtlText]}>{`${routeOrigin} → ${routeDestination}`}</Text>
        <Text style={[styles.flightTimes, isRTL && styles.rtlText]}>{outboundTimes}</Text>
        <Text style={[styles.carrierInfo, isRTL && styles.rtlText]}>{carrierLabel}</Text>
        <Text style={[styles.flightInfo, isRTL && styles.rtlText]}>{outboundInfo}</Text>
        <Text style={[styles.flightPrice, isRTL && styles.rtlText]}>{formattedPrice}</Text>
        {hasInbound ? (
          <View style={styles.returnBlock}>
            <Text style={[styles.returnTitle, isRTL && styles.rtlText]}>{`Ritorno: ${inboundTimes}`}</Text>
            <Text style={[styles.returnInfo, isRTL && styles.rtlText]}>{inboundInfo}</Text>
          </View>
        ) : null}
      </View>
    );
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
  const hasResults = results.length > 0;
  const listData = hasResults ? results : [];

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
            data={listData}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderTrip}
            contentContainerStyle={[styles.list, isWeb && styles.webList]}
            ListHeaderComponent={
              <View style={[styles.filtersContainer, isWeb && styles.filtersWeb]}>
                <Text style={[styles.heading, isRTL && styles.rtlText]}>{travelStrings.searchTitle}</Text>
                <Text style={[styles.subtitle, isRTL && styles.rtlText]}>{travelStrings.searchSubtitle}</Text>

                <Text style={[styles.label, isRTL && styles.rtlText]}>{travelStrings.departureCountryLabel}</Text>
                {renderSegmentedControl(countryOptions, departureCountry, setDepartureCountry)}

                <View style={[styles.dropdownTabsWrapper, isRTL && styles.dropdownTabsWrapperRtl]}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.dropdownTabsRow, isRTL && styles.dropdownTabsRowRtl]}
                  >
                    {dropdownTabs.map((tab) => (
                      <DropdownTab
                        key={tab.key}
                        label={tab.label}
                        value={tab.value}
                        isOpen={openDropdown === tab.key}
                        onPress={() => toggleDropdown(tab.key)}
                        isRTL={isRTL}
                        ref={tabRefs.current[tab.key]}
                      />
                    ))}
                  </ScrollView>
                </View>

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

                <Text style={[styles.helper, isRTL && styles.rtlText]}>{travelStrings.filterHint}</Text>

                {dirtyFilters ? (
                  <Text style={[styles.dirtyHint, isRTL && styles.rtlText]}>{travelStrings.filtersDirtyHint}</Text>
                ) : null}

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
            ListEmptyComponent={!hasResults ? renderStatusState : null}
            showsVerticalScrollIndicator={false}
          />
          {openDropdown && activeDropdown ? (
            <Modal transparent animationType="fade" visible onRequestClose={closeDropdown}>
              <Pressable style={styles.modalBackdrop} onPress={closeDropdown} />
              <View style={[styles.dropdownPanel, getDropdownPanelStyle()]}>
                {activeDropdown.options.map((option) => {
                  const isSelected = activeDropdown.selectedValue === option.value;
                  return (
                    <Pressable
                      key={option.key || option.value}
                      style={[styles.dropdownOption, isSelected && styles.dropdownOptionSelected]}
                      onPress={() => {
                        activeDropdown.onSelect(option.value);
                        closeDropdown();
                      }}
                    >
                      <Text
                        style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextSelected, isRTL && styles.rtlText]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Modal>
          ) : null}
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
    position: 'relative',
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
  dropdownTabsWrapper: {
    marginTop: theme.spacing.sm,
  },
  dropdownTabsWrapperRtl: {
    alignItems: 'flex-end',
  },
  dropdownTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  dropdownTabsRowRtl: {
    flexDirection: 'row-reverse',
  },
  dropdownTab: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    ...theme.shadow.card,
  },
  dropdownTabRtl: {
    marginRight: 0,
    marginLeft: theme.spacing.sm,
  },
  dropdownTabOpen: {
    borderColor: theme.colors.primary,
  },
  dropdownTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dropdownTabContentRtl: {
    flexDirection: 'row-reverse',
  },
  dropdownTabText: {
    color: theme.colors.text,
    fontWeight: '600',
    maxWidth: 180,
  },
  dropdownTabIcon: {
    color: theme.colors.muted,
    fontSize: 12,
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
  dirtyHint: {
    fontSize: 13,
    color: theme.colors.secondary,
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
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
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
  dropdownPanel: {
    position: 'absolute',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    ...theme.shadow.card,
    zIndex: 9999,
    elevation: 9999,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
  },
  dropdownOptionSelected: {
    backgroundColor: 'rgba(231, 0, 19, 0.08)',
  },
  dropdownOptionText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  dropdownOptionTextSelected: {
    color: theme.colors.primary,
  },
  flightCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    ...theme.shadow.card,
  },
  flightRouteTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  flightTimes: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
  flightInfo: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  carrierInfo: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  flightPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    marginTop: 2,
  },
  returnBlock: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 2,
  },
  returnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  returnInfo: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default TravelScreen;
