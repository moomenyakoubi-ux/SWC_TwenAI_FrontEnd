import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';
import { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';
import { supabase } from '../lib/supabase';
import useSession from '../auth/useSession';

const PAGE_SIZE = 20;

const getInitials = (value) =>
  String(value || '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const AddContactScreen = () => {
  const { strings, isRTL } = useLanguage();
  const isWeb = Platform.OS === 'web';
  const menuStrings = strings.menu;
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [followMap, setFollowMap] = useState({});
  const [followLoading, setFollowLoading] = useState({});
  const [error, setError] = useState(null);
  const showContactsOnly = route.params?.showContactsOnly === true;

  const updateFollowState = useCallback((profileId, isFollowing) => {
    setFollowMap((prev) => ({ ...prev, [profileId]: isFollowing }));
    setResults((prev) =>
      prev.map((item) => (item.id === profileId ? { ...item, isFollowing } : item)),
    );
  }, []);

  const setFollowLoadingState = useCallback((profileId, value) => {
    setFollowLoading((prev) => ({ ...prev, [profileId]: value }));
  }, []);

  const fetchProfiles = useCallback(
    async (pageNumber) => {
      if (!user) return;
      if (!hasMore && pageNumber > 0) return;
      setLoading(true);
      setError(null);
      const trimmed = String(query || '').trim();
      const searchTerm = trimmed.length ? `%${trimmed}%` : '%';
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('id', user.id)
        .ilike('full_name', searchTerm)
        .order('full_name', { ascending: true })
        .range(from, to);

      if (fetchError) {
        setError(fetchError);
        setLoading(false);
        return;
      }

      const profileRows = data || [];
      const profileIds = profileRows.map((item) => item.id).filter(Boolean);
      let followingIds = new Set();

      if (profileIds.length) {
        const { data: followRows, error: followError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', profileIds);

        if (!followError) {
          followingIds = new Set((followRows || []).map((row) => row.following_id));
        }
      }

      const mapped = profileRows.map((item) => ({
        id: item.id,
        fullName: item.full_name || 'Utente',
        avatarUrl: item.avatar_url || '',
        isFollowing: followingIds.has(item.id),
      }));

      setResults((prev) => (pageNumber === 0 ? mapped : [...prev, ...mapped]));
      setHasMore(profileRows.length === PAGE_SIZE);
      setFollowMap((prev) => {
        const next = { ...prev };
        profileIds.forEach((profileId) => {
          next[profileId] = followingIds.has(profileId);
        });
        return next;
      });
      setLoading(false);
    },
    [hasMore, query, user],
  );

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setResults([]);
    setFollowMap({});
    setFollowLoading({});
    setError(null);
  }, [query, user?.id]);

  useEffect(() => {
    fetchProfiles(page);
  }, [fetchProfiles, page]);

  const handleToggleFollow = async (profileId) => {
    if (!user) return;
    if (followLoading[profileId]) return;
    const isFollowing = Boolean(followMap[profileId]);
    updateFollowState(profileId, !isFollowing);
    setFollowLoadingState(profileId, true);

    if (!isFollowing) {
      const { error: insertError } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: profileId });
      if (insertError) {
        if (insertError.code !== '23505') {
          updateFollowState(profileId, false);
        }
      }
      setFollowLoadingState(profileId, false);
      return;
    }

    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', profileId);
    if (deleteError) {
      updateFollowState(profileId, true);
    }
    setFollowLoadingState(profileId, false);
  };

  const filtered = useMemo(() => {
    if (!showContactsOnly) return results;
    return results.filter((item) => item.isFollowing);
  }, [results, showContactsOnly]);

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.webSafeArea]}>
      <Navbar
        title={menuStrings.addContact}
        isRTL={isRTL}
        onBack={() => navigation.goBack()}
        backLabel={strings.tabs.home}
      />
      <View style={[styles.container, isWeb && styles.webContainer]}>
        <View style={[styles.searchBox, isRTL && styles.rowReverse]}>
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.rtlText]}
            placeholder="Cerca per nome"
            placeholderTextColor={theme.colors.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {error ? (
          <Text style={[styles.errorText, isRTL && styles.rtlText]}>{error.message}</Text>
        ) : null}
        {loading && results.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.secondary} />
            <Text style={[styles.loadingText, isRTL && styles.rtlText]}>Caricamento profili...</Text>
          </View>
        ) : null}
        {!loading && filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, isRTL && styles.rtlText]}>Nessun profilo trovato</Text>
            <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
              Prova con un nome diverso.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (!loading && hasMore) {
                setPage((prev) => prev + 1);
              }
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loading && results.length > 0 ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.colors.secondary} />
                  <Text style={[styles.loadingText, isRTL && styles.rtlText]}>Caricamento...</Text>
                </View>
              ) : hasMore ? (
                <TouchableOpacity style={styles.loadMoreButton} onPress={() => setPage((prev) => prev + 1)}>
                  <Text style={styles.loadMoreText}>Carica altri</Text>
                </TouchableOpacity>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, isRTL && styles.rowReverse]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('PublicProfile', { profileId: item.id })}
              >
                <View style={[styles.avatar, { backgroundColor: 'rgba(12,27,51,0.08)' }]}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {getInitials(item.fullName || 'U')}
                    </Text>
                  )}
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, isRTL && styles.rtlText]}>{item.fullName}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, item.isFollowing && styles.removeButton]}
                  onPress={() => handleToggleFollow(item.id)}
                  disabled={followLoading[item.id]}
                >
                  {followLoading[item.id] ? (
                    <ActivityIndicator size="small" color={theme.colors.card} />
                  ) : (
                    <>
                      <Ionicons
                        name={item.isFollowing ? 'checkmark' : 'person-add'}
                        size={18}
                        color={theme.colors.card}
                      />
                      <Text style={styles.addButtonText}>
                        {item.isFollowing ? 'Seguito' : 'Segui'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  webSafeArea: {
    paddingLeft: WEB_TAB_BAR_WIDTH,
  },
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  webContainer: {
    paddingLeft: theme.spacing.xl,
    paddingRight: theme.spacing.xl + WEB_SIDE_MENU_WIDTH,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#fff',
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    ...theme.shadow.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  listContent: {
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: '#fff',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.card,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  meta: {
    color: theme.colors.muted,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: theme.colors.card,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    color: theme.colors.muted,
  },
  errorText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadow.card,
  },
  emptyTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: theme.colors.text,
  },
  emptyText: {
    color: theme.colors.muted,
    textAlign: 'center',
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(12,27,51,0.08)',
  },
  loadMoreText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  removeButton: {
    backgroundColor: theme.colors.primary,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default AddContactScreen;
