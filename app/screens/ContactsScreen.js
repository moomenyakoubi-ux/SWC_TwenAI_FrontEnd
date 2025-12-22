import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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

const ContactsScreen = () => {
  const navigation = useNavigation();
  const { strings, isRTL } = useLanguage();
  const isWeb = Platform.OS === 'web';
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [followLoading, setFollowLoading] = useState({});
  const title = strings.menu?.contacts || 'Contatti';

  const fetchFollowing = useCallback(
    async (pageNumber) => {
      if (!user) return;
      if (!hasMore && pageNumber > 0) return;
      setLoading(true);
      setError(null);
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: fetchError } = await supabase
        .from('follows')
        .select('following_id, created_at')
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fetchError) {
        setError(fetchError);
        setLoading(false);
        return;
      }

      const rows = data || [];
      const ids = rows.map((row) => row.following_id).filter(Boolean);
      let profilesMap = {};
      if (ids.length) {
        const { data: profileRows, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', ids);
        if (profilesError) {
          setError(profilesError);
          setLoading(false);
          return;
        }
        profilesMap = (profileRows || []).reduce((acc, row) => {
          acc[row.id] = row;
          return acc;
        }, {});
      }

      const mapped = ids
        .map((id) => {
          const profile = profilesMap[id];
          if (!profile) return null;
          return {
            id,
            fullName: profile.full_name || 'Utente',
            avatarUrl: profile.avatar_url || '',
            isFollowing: true,
          };
        })
        .filter(Boolean);

      setFollowing((prev) => (pageNumber === 0 ? mapped : [...prev, ...mapped]));
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    },
    [hasMore, user],
  );

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setFollowing([]);
    setFollowLoading({});
  }, [user?.id]);

  useEffect(() => {
    fetchFollowing(page);
  }, [fetchFollowing, page]);

  const handleUnfollow = async (profileId) => {
    if (!user) return;
    if (followLoading[profileId]) return;
    const previous = following;
    setFollowing((prev) => prev.filter((item) => item.id !== profileId));
    setFollowLoading((prev) => ({ ...prev, [profileId]: true }));
    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', profileId);
    if (deleteError) {
      setFollowing(previous);
    }
    setFollowLoading((prev) => ({ ...prev, [profileId]: false }));
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return following;
    const lower = query.toLowerCase();
    return following.filter(
      (item) => item.fullName.toLowerCase().includes(lower),
    );
  }, [following, query]);

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.webSafeArea]}>
      <Navbar
        title={title}
        isRTL={isRTL}
        onBack={() => navigation.goBack()}
        backLabel={strings.tabs?.home}
      />
      <View style={[styles.container, isWeb && styles.webContainer]}>
        <View style={[styles.searchBox, isRTL && styles.rowReverse]}>
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.rtlText]}
            placeholder="Cerca tra i tuoi seguiti"
            placeholderTextColor={theme.colors.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {error ? (
          <Text style={[styles.errorText, isRTL && styles.rtlText]}>{error.message}</Text>
        ) : null}
        {loading && following.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.secondary} />
            <Text style={[styles.loadingText, isRTL && styles.rtlText]}>Caricamento...</Text>
          </View>
        ) : null}
        {!loading && filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, isRTL && styles.rtlText]}>Nessun seguito</Text>
            <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
              Segui nuovi profili dalla sezione contatti.
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
              loading && following.length > 0 ? (
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
                  style={styles.removeButton}
                  onPress={() => handleUnfollow(item.id)}
                  disabled={followLoading[item.id]}
                >
                  {followLoading[item.id] ? (
                    <ActivityIndicator size="small" color={theme.colors.card} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color={theme.colors.card} />
                      <Text style={styles.removeButtonText}>Seguito</Text>
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
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
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
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  removeButtonText: {
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
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default ContactsScreen;
