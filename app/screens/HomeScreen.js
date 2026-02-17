import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import PostCard from '../components/PostCard';
import fakeNews from '../data/fakeNews';
import fakeEvents from '../data/fakeEvents';
import fakePlaces from '../data/fakePlaces';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';
import { usePosts } from '../context/PostsContext';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';
import useSession from '../auth/useSession';
import { fetchHomeFeed } from '../services/contentApi';

const backgroundImage = require('../images/image1.png');
const HOME_PAGE_SIZE = 10;

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const dedupeFeedItems = (items) => {
  const map = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
};

const normalizeExternalUrl = (targetUrl) => {
  const raw = String(targetUrl || '').trim();
  if (!raw) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
};

const HomeScreen = ({ navigation }) => {
  const isWeb = Platform.OS === 'web';
  const { session } = useSession();
  const { strings, isRTL } = useLanguage();
  const homeStrings = strings.home;
  const menuStrings = strings.menu;
  const retryLabel = strings.travel?.retryLabel || 'Riprova';
  const openLabel = 'Apri';

  const { posts, refreshFeed } = usePosts();
  const [homeFeedItems, setHomeFeedItems] = useState([]);
  const [homeFeedError, setHomeFeedError] = useState(null);
  const [initialFeedLoading, setInitialFeedLoading] = useState(true);
  const [refreshingFeed, setRefreshingFeed] = useState(false);
  const [loadingMoreFeed, setLoadingMoreFeed] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sideMenuWidth = isWeb ? WEB_SIDE_MENU_WIDTH : 280;
  const slideAnim = useRef(new Animated.Value(isWeb ? 1 : 0)).current;
  const requestInFlightRef = useRef(false);
  const feedOffsetRef = useRef(0);
  const hasMoreFeedRef = useRef(true);
  const feedItemsCountRef = useRef(0);

  const selection = useMemo(
    () => ({
      news: pickRandom(fakeNews),
      event: pickRandom(fakeEvents),
      place: pickRandom(fakePlaces),
    }),
    [],
  );

  const postsById = useMemo(() => {
    const map = new Map();
    posts.forEach((post) => {
      map.set(String(post.id), post);
    });
    return map;
  }, [posts]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isMenuOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen, slideAnim]);

  const showSoftError = useCallback((message) => {
    const text = message || 'Non siamo riusciti ad aggiornare il feed. Riprova.';
    if (Platform.OS === 'web') {
      console.warn('[home-feed] request failed:', text);
      return;
    }
    Alert.alert(homeStrings.communityPosts, text);
  }, [homeStrings.communityPosts]);

  const openSponsoredLink = useCallback(
    async (targetUrl) => {
      const normalized = normalizeExternalUrl(targetUrl);
      if (!normalized) {
        showSoftError('Link non disponibile.');
        return;
      }

      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.open(normalized, '_blank', 'noopener,noreferrer');
          return;
        }

        const canOpen = await Linking.canOpenURL(normalized);
        if (!canOpen) {
          throw new Error('URL non valido');
        }
        await Linking.openURL(normalized);
      } catch (_error) {
        showSoftError('Impossibile aprire il link al momento.');
      }
    },
    [showSoftError],
  );

  const loadHomeFeed = useCallback(
    async ({ reset = false, silent = false } = {}) => {
      if (requestInFlightRef.current) return;
      if (!reset && !hasMoreFeedRef.current) return;

      requestInFlightRef.current = true;
      const nextOffset = reset ? 0 : feedOffsetRef.current;
      const hasExistingItems = feedItemsCountRef.current > 0;

      if (reset) {
        setRefreshingFeed(hasExistingItems);
        if (!hasExistingItems) setInitialFeedLoading(true);
      } else if (nextOffset > 0) {
        setLoadingMoreFeed(true);
      } else {
        setInitialFeedLoading(true);
      }

      try {
        const response = await fetchHomeFeed({
          limit: HOME_PAGE_SIZE,
          offset: nextOffset,
          accessToken: session?.access_token || null,
        });
        const incoming = Array.isArray(response?.items) ? response.items : [];
        const nextHasMore = incoming.length > 0 && Boolean(response?.hasMore);
        const nextOffsetValue =
          typeof response?.nextOffset === 'number' ? response.nextOffset : nextOffset + incoming.length;

        setHomeFeedError(null);
        hasMoreFeedRef.current = nextHasMore;
        feedOffsetRef.current = nextOffsetValue;

        if (reset) {
          const deduped = dedupeFeedItems(incoming);
          feedItemsCountRef.current = deduped.length;
          setHomeFeedItems(deduped);
        } else {
          setHomeFeedItems((prev) => {
            const merged = dedupeFeedItems([...prev, ...incoming]);
            feedItemsCountRef.current = merged.length;
            return merged;
          });
        }
      } catch (requestError) {
        setHomeFeedError(requestError);
        if (!silent) {
          showSoftError(requestError?.message);
        }
      } finally {
        requestInFlightRef.current = false;
        setInitialFeedLoading(false);
        setRefreshingFeed(false);
        setLoadingMoreFeed(false);
      }
    },
    [session?.access_token, showSoftError],
  );

  useFocusEffect(
    React.useCallback(() => {
      if (refreshFeed) {
        refreshFeed();
      }
      loadHomeFeed({ reset: true, silent: true });
    }, [loadHomeFeed, refreshFeed]),
  );

  const handleRefresh = useCallback(() => {
    feedOffsetRef.current = 0;
    hasMoreFeedRef.current = true;
    if (refreshFeed) {
      refreshFeed();
    }
    loadHomeFeed({ reset: true });
  }, [loadHomeFeed, refreshFeed]);

  const handleEndReached = useCallback(() => {
    if (initialFeedLoading || refreshingFeed || loadingMoreFeed) return;
    if (!hasMoreFeedRef.current) return;
    loadHomeFeed();
  }, [initialFeedLoading, loadHomeFeed, loadingMoreFeed, refreshingFeed]);

  const keyExtractor = useCallback((item) => item.id, []);

  const renderFeedItem = useCallback(
    ({ item }) => {
      if (item.kind === 'official') {
        return (
          <View style={styles.officialCard}>
            <View style={styles.officialBadgeRow}>
              <Text style={styles.officialBadge}>TwensAI</Text>
            </View>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.feedImage} /> : null}
            <View style={styles.feedTextWrap}>
              <Text style={[styles.feedTitle, isRTL && styles.rtlText]}>{item.title}</Text>
              {item.body ? <Text style={[styles.feedBody, isRTL && styles.rtlText]}>{item.body}</Text> : null}
            </View>
          </View>
        );
      }

      if (item.kind === 'sponsored') {
        const sponsoredUrl = normalizeExternalUrl(item.targetUrl);
        const hasTargetUrl = Boolean(sponsoredUrl);

        return (
          <View style={styles.sponsoredCard}>
            <View style={styles.sponsoredHeader}>
              <Text style={styles.sponsoredBadge}>Sponsorizzato</Text>
              <Text style={[styles.sponsorName, isRTL && styles.rtlText]}>{item.sponsorName}</Text>
            </View>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.feedImage} /> : null}
            <View style={styles.feedTextWrap}>
              <Text style={[styles.feedTitle, isRTL && styles.rtlText]}>{item.title}</Text>
              {item.body ? <Text style={[styles.feedBody, isRTL && styles.rtlText]}>{item.body}</Text> : null}
              {hasTargetUrl ? (
                <Pressable style={styles.sponsoredCta} onPress={() => openSponsoredLink(sponsoredUrl)}>
                  <Text style={styles.sponsoredCtaText}>{item.ctaLabel || openLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      }

      const fallbackPost = item.post;
      const post = postsById.get(String(fallbackPost?.id)) || fallbackPost;
      if (!post) return null;

      return (
        <PostCard
          post={post}
          isRTL={isRTL}
          onPressAuthor={
            post.authorId ? () => navigation.navigate('PublicProfile', { profileId: post.authorId }) : undefined
          }
        />
      );
    },
    [isRTL, navigation, openLabel, openSponsoredLink, postsById],
  );

  const listHeader = useMemo(
    () => (
      <View>
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
        {homeFeedError && homeFeedItems.length > 0 ? (
          <View style={styles.feedErrorBox}>
            <Text style={[styles.feedErrorText, isRTL && styles.rtlText]}>
              {homeFeedError?.message || 'Errore caricamento feed.'}
            </Text>
            <Pressable style={styles.retryButton} onPress={() => loadHomeFeed({ reset: true })}>
              <Text style={styles.retryButtonText}>{retryLabel}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    ),
    [homeFeedError, homeFeedItems.length, homeStrings, isRTL, loadHomeFeed, retryLabel, selection, strings.news.category],
  );

  const listEmpty = useMemo(() => {
    if (initialFeedLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.emptyText, isRTL && styles.rtlText]}>Caricamento feed...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
          {homeFeedError ? homeFeedError.message : 'Nessun contenuto disponibile per ora.'}
        </Text>
        <Pressable style={styles.retryButton} onPress={() => loadHomeFeed({ reset: true })}>
          <Text style={styles.retryButtonText}>{retryLabel}</Text>
        </Pressable>
      </View>
    );
  }, [homeFeedError, initialFeedLoading, isRTL, loadHomeFeed, retryLabel]);

  const listFooter = useMemo(() => {
    if (!loadingMoreFeed) {
      return <View style={styles.footerSpacer} />;
    }
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }, [loadingMoreFeed]);

  return (
    <ImageBackground
      source={backgroundImage}
      defaultSource={backgroundImage}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        <View style={[styles.header, isRTL && styles.headerRtl, isWeb && styles.headerWeb]}>
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

        <FlatList
          data={homeFeedItems}
          keyExtractor={keyExtractor}
          renderItem={renderFeedItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={[
            styles.content,
            isWeb && {
              paddingRight: sideMenuWidth + theme.spacing.lg,
              paddingLeft: WEB_TAB_BAR_WIDTH + theme.spacing.lg,
            },
          ]}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.35}
          refreshing={refreshingFeed}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />

        {isMenuOpen && !isWeb && (
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setIsMenuOpen(false)} />
        )}
        {!isWeb ? (
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
                    setIsMenuOpen(false);
                    navigation.navigate(item.route);
                  }}
                >
                  <Ionicons name={item.icon} size={22} color={theme.colors.secondary} />
                  <Text style={[styles.menuLabel, isRTL && styles.rtlText]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        ) : null}
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
  headerWeb: {
    paddingLeft: theme.spacing.lg + WEB_TAB_BAR_WIDTH,
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
  officialCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  officialBadgeRow: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  officialBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(231, 0, 19, 0.15)',
    color: theme.colors.secondary,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sponsoredCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  sponsoredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  sponsoredBadge: {
    backgroundColor: 'rgba(242, 163, 101, 0.22)',
    color: '#8A1C09',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sponsorName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    flexShrink: 1,
  },
  feedImage: {
    width: '100%',
    height: 170,
    marginTop: theme.spacing.sm,
  },
  feedTextWrap: {
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  feedBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  sponsoredCta: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  sponsoredCtaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  feedErrorBox: {
    backgroundColor: 'rgba(214, 69, 69, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(214, 69, 69, 0.25)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  feedErrorText: {
    color: theme.colors.danger || '#d64545',
    fontWeight: '600',
    flex: 1,
    fontSize: 13,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    color: theme.colors.card,
    opacity: 0.95,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  footerLoader: {
    paddingVertical: theme.spacing.md,
  },
  footerSpacer: {
    height: theme.spacing.md,
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
