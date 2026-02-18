import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Navbar from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import useSession from '../auth/useSession';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';
import { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';
import PostCard from '../components/PostCard';
import { fetchUserPosts } from '../services/contentApi';

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const getInitials = (value) =>
  String(value || '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const PublicProfileScreen = ({ route, navigation }) => {
  const { strings, isRTL } = useLanguage();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isWeb = Platform.OS === 'web';
  const profileId = route.params?.profileId;
  const isValidProfileId = isUuid(profileId);
  const { user } = useSession();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [activeList, setActiveList] = useState(null);
  const [privacyHint, setPrivacyHint] = useState('');
  const [followingCount, setFollowingCount] = useState(null);
  const [followersCount, setFollowersCount] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(0);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [followers, setFollowers] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersPage, setFollowersPage] = useState(0);
  const [followersHasMore, setFollowersHasMore] = useState(true);
  const [following, setFollowing] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingPage, setFollowingPage] = useState(0);
  const [followingHasMore, setFollowingHasMore] = useState(true);
  const [followStatus, setFollowStatus] = useState({});
  const [rowLoading, setRowLoading] = useState({});
  const [startingChat, setStartingChat] = useState(false);

  const isSelf = user?.id === profileId;

  const resetLists = useCallback(() => {
    setPosts([]);
    setPostsPage(0);
    setPostsHasMore(true);
    setFollowers([]);
    setFollowersPage(0);
    setFollowersHasMore(true);
    setFollowing([]);
    setFollowingPage(0);
    setFollowingHasMore(true);
    setFollowStatus({});
    setRowLoading({});
  }, []);

  const handleError = useCallback((err) => {
    if (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isValidProfileId) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .eq('id', profileId)
          .maybeSingle();

        if (fetchError) {
          handleError(fetchError);
          setLoading(false);
          return;
        }

        setProfile(data || null);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [handleError, isValidProfileId, profileId]);

  useEffect(() => {
    if (!isValidProfileId) return;
    resetLists();
    setActiveList(null);
    setPrivacyHint('');
    setFollowingCount(null);
    setFollowersCount(null);
  }, [isValidProfileId, profileId, resetLists]);

  const isFollowing = useCallback(async (targetId) => {
    if (!user || !targetId || user.id === targetId) {
      return false;
    }
    try {
      const { data, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('following_id', targetId)
        .maybeSingle();
      if (followError) {
        handleError(followError);
        return false;
      }
      return Boolean(data);
    } catch (err) {
      handleError(err);
      return false;
    }
  }, [handleError, user]);

  useEffect(() => {
    const fetchFollowState = async () => {
      if (!user || !isValidProfileId) return;
      if (user.id === profileId) {
        setIsFollowingUser(true);
        setActiveList(null);
        return;
      }
      const following = await isFollowing(profileId);
      setIsFollowingUser(following);
      setActiveList(null);
      if (!following) {
        resetLists();
      }
    };

    fetchFollowState();
  }, [isFollowing, isValidProfileId, profileId, resetLists, user]);

  const initials = useMemo(
    () =>
      (profile?.full_name || 'Utente')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [profile?.full_name],
  );

  const profileStrings = strings.profiles ?? {};
  const canViewPrivate = isSelf || isFollowingUser;
  const canMessage = isFollowingUser && !isSelf;

  const handleMessagePress = async () => {
    if (!user || !isValidProfileId || startingChat || !canMessage) return;
    setStartingChat(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_or_create_dm', {
        other_user_id: profileId,
      });
      const conversationId = data?.conversation_id || data;
      if (rpcError || !conversationId) {
        Alert.alert('Messaggio', 'You can message this user only if you follow them');
        return;
      }
      navigation.navigate('Chat', { conversationId });
    } catch (err) {
      Alert.alert('Messaggio', 'You can message this user only if you follow them');
    } finally {
      setStartingChat(false);
    }
  };

  const fetchCounts = useCallback(async () => {
    if (!isValidProfileId) return;
    if (!canViewPrivate) {
      setFollowingCount(null);
      setFollowersCount(null);
      return;
    }
    try {
      const [{ count: following }, { count: followers }] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileId),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profileId),
      ]);
      setFollowingCount(typeof following === 'number' ? following : 0);
      setFollowersCount(typeof followers === 'number' ? followers : 0);
    } catch (err) {
      handleError(err);
    }
  }, [canViewPrivate, handleError, isValidProfileId, profileId]);

  useEffect(() => {
    if (!isValidProfileId) return;
    fetchCounts();
  }, [fetchCounts, isFollowingUser, isValidProfileId, profileId]);

  useFocusEffect(
    useCallback(() => {
      if (!user || !isValidProfileId) return;
      if (user.id === profileId) {
        setIsFollowingUser(true);
        fetchCounts();
        return;
      }
      isFollowing(profileId).then((following) => {
        setIsFollowingUser(following);
        if (!following) {
          setActiveList(null);
          resetLists();
        }
        fetchCounts();
      });
    }, [fetchCounts, isFollowing, isValidProfileId, profileId, resetLists, user]),
  );

  const handleToggleFollow = async () => {
    if (!user || !isValidProfileId || isSelf || toggling) return;
    const next = !isFollowingUser;
    setIsFollowingUser(next);
    if (!next) {
      resetLists();
    }
    setToggling(true);
    if (next) {
      const { error: insertError } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: profileId });
      if (insertError) {
        if (insertError.code !== '23505') {
          setIsFollowingUser(false);
          setActiveList(null);
          resetLists();
        }
      }
    } else {
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profileId);
      if (deleteError) {
        setIsFollowingUser(true);
      }
    }
    setToggling(false);
    fetchCounts();
  };

  const fetchPosts = useCallback(async (pageNumber) => {
    if (!profileId) return;
    if (!postsHasMore && pageNumber > 0) return;
    setPostsLoading(true);
    const offset = pageNumber * 20;
    try {
      const response = await fetchUserPosts({
        userId: profileId,
        limit: 20,
        offset,
      });
      const incoming = Array.isArray(response?.items) ? response.items : [];
      setPosts((prev) => (pageNumber === 0 ? incoming : [...prev, ...incoming]));
      if (typeof response?.hasMore === 'boolean') {
        setPostsHasMore(response.hasMore && incoming.length > 0);
      } else {
        setPostsHasMore(incoming.length === 20);
      }
    } catch (err) {
      if (err?.code === 'AUTH_REQUIRED') {
        await supabase.auth.signOut();
        return;
      }
      handleError(err);
    } finally {
      setPostsLoading(false);
    }
  }, [handleError, postsHasMore, profileId]);

  const fetchFollowers = useCallback(async (pageNumber) => {
    if (!profileId) return;
    if (!followersHasMore && pageNumber > 0) return;
    setFollowersLoading(true);
    const from = pageNumber * 20;
    const to = from + 19;
    try {
      const { data, error: followError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', profileId)
        .range(from, to);
      if (followError) {
        handleError(followError);
        setFollowersLoading(false);
        return;
      }
      const ids = (data || []).map((row) => row.follower_id).filter(Boolean);
      let profilesMap = {};
      if (ids.length) {
        const { data: profileRows, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', ids);
        if (profilesError) {
          handleError(profilesError);
          setFollowersLoading(false);
          return;
        }
        profilesMap = (profileRows || []).reduce((acc, row) => {
          acc[row.id] = row;
          return acc;
        }, {});
      }
      const mapped = ids
        .map((id) => {
          const row = profilesMap[id];
          if (!row) return null;
          return { id, fullName: row.full_name || 'Utente', avatarUrl: row.avatar_url || '' };
        })
        .filter(Boolean);
      setFollowers((prev) => (pageNumber === 0 ? mapped : [...prev, ...mapped]));
      setFollowersHasMore((data || []).length === 20);
      if (user?.id && ids.length) {
        const { data: followRows, error: followError2 } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', ids);
        if (followError2) {
          handleError(followError2);
        }
        const followSet = new Set((followRows || []).map((row) => row.following_id));
        setFollowStatus((prev) => {
          const next = { ...prev };
          ids.forEach((id) => {
            next[id] = followSet.has(id);
          });
          return next;
        });
      }
    } catch (err) {
      handleError(err);
    } finally {
      setFollowersLoading(false);
    }
  }, [followersHasMore, handleError, profileId, user?.id]);

  const fetchFollowing = useCallback(async (pageNumber) => {
    if (!profileId) return;
    if (!followingHasMore && pageNumber > 0) return;
    setFollowingLoading(true);
    const from = pageNumber * 20;
    const to = from + 19;
    try {
      const { data, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profileId)
        .range(from, to);
      if (followError) {
        handleError(followError);
        setFollowingLoading(false);
        return;
      }
      const ids = (data || []).map((row) => row.following_id).filter(Boolean);
      let profilesMap = {};
      if (ids.length) {
        const { data: profileRows, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', ids);
        if (profilesError) {
          handleError(profilesError);
          setFollowingLoading(false);
          return;
        }
        profilesMap = (profileRows || []).reduce((acc, row) => {
          acc[row.id] = row;
          return acc;
        }, {});
      }
      const mapped = ids
        .map((id) => {
          const row = profilesMap[id];
          if (!row) return null;
          return { id, fullName: row.full_name || 'Utente', avatarUrl: row.avatar_url || '' };
        })
        .filter(Boolean);
      setFollowing((prev) => (pageNumber === 0 ? mapped : [...prev, ...mapped]));
      setFollowingHasMore((data || []).length === 20);
      if (user?.id && ids.length) {
        const { data: followRows, error: followError2 } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', ids);
        if (followError2) {
          handleError(followError2);
        }
        const followSet = new Set((followRows || []).map((row) => row.following_id));
        setFollowStatus((prev) => {
          const next = { ...prev };
          ids.forEach((id) => {
            next[id] = followSet.has(id);
          });
          return next;
        });
      }
    } catch (err) {
      handleError(err);
    } finally {
      setFollowingLoading(false);
    }
  }, [followingHasMore, handleError, profileId, user?.id]);

  useEffect(() => {
    if (!canViewPrivate) return;
    fetchPosts(postsPage);
  }, [canViewPrivate, fetchPosts, postsPage]);

  useEffect(() => {
    if (!canViewPrivate) return;
    if (activeList === 'followers') {
      fetchFollowers(followersPage);
    }
  }, [activeList, canViewPrivate, fetchFollowers, followersPage]);

  useEffect(() => {
    if (!canViewPrivate) return;
    if (activeList === 'following') {
      fetchFollowing(followingPage);
    }
  }, [activeList, canViewPrivate, fetchFollowing, followingPage]);

  const toggleRowFollow = async (targetId) => {
    if (!user || !targetId || targetId === user.id) return;
    if (rowLoading[targetId]) return;
    const currentlyFollowing = Boolean(followStatus[targetId]);
    setFollowStatus((prev) => ({ ...prev, [targetId]: !currentlyFollowing }));
    setRowLoading((prev) => ({ ...prev, [targetId]: true }));
    if (!currentlyFollowing) {
      const { error: insertError } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetId });
      if (insertError && insertError.code !== '23505') {
        setFollowStatus((prev) => ({ ...prev, [targetId]: currentlyFollowing }));
      }
    } else {
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetId);
      if (deleteError) {
        setFollowStatus((prev) => ({ ...prev, [targetId]: currentlyFollowing }));
      }
    }
    setRowLoading((prev) => ({ ...prev, [targetId]: false }));
  };

  if (!isValidProfileId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Navbar
          title={profileStrings.title || strings.menu.userProfile}
          isRTL={isRTL}
          isElevated
          onBack={() => navigation.goBack()}
          backLabel={strings.tabs.home}
        />
        <View style={[styles.content, isWeb && styles.webContent]}>
          <View style={styles.card}>
            <Text style={[styles.mutedText, isRTL && styles.rtlText]}>
              Profilo non disponibile.
            </Text>
            <TouchableOpacity style={styles.followButton} onPress={() => navigation.goBack()}>
              <Text style={styles.followButtonText}>Torna indietro</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Navbar
        title={profileStrings.title || strings.menu.userProfile}
        isRTL={isRTL}
        isElevated
        onBack={() => navigation.goBack()}
        backLabel={strings.tabs.home}
      />
      <ScrollView
        style={[styles.scrollView, isWeb && styles.webScrollView]}
        contentContainerStyle={[styles.content, isWeb && styles.webContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, isRTL && styles.rowReverse]}>
          <View style={styles.avatarBorder}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerMeta}>
            <Text style={[styles.name, isRTL && styles.rtlText]}>
              {profile?.full_name || strings.menu?.userProfile || 'Profilo'}
            </Text>
            {!isSelf ? (
              <TouchableOpacity
                style={[styles.followButton, isFollowingUser && styles.followButtonActive]}
                onPress={handleToggleFollow}
                disabled={toggling}
              >
                {toggling ? (
                  <ActivityIndicator size="small" color={theme.colors.card} />
                ) : (
                  <>
                    <Text style={styles.followButtonText}>
                      {isFollowingUser ? 'Seguito' : 'Segui'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
            {loading ? (
              <View style={[styles.loadingRow, styles.bioBlock, isRTL && styles.rowReverse]}>
                <ActivityIndicator size="small" color={theme.colors.secondary} />
                <Text style={[styles.mutedText, isRTL && styles.rtlText]}>Caricamento profilo...</Text>
              </View>
            ) : profile?.bio ? (
              <Text style={[styles.bio, styles.bioBlock, isRTL && styles.rtlText]}>{profile.bio}</Text>
            ) : (
              <Text style={[styles.bioPlaceholder, styles.bioBlock, isRTL && styles.rtlText]}>
                Nessuna bio disponibile.
              </Text>
            )}
            {canMessage ? (
              <TouchableOpacity
                style={[styles.messageButton, startingChat && styles.messageButtonDisabled]}
                onPress={handleMessagePress}
                disabled={startingChat}
              >
                {startingChat ? (
                  <ActivityIndicator size="small" color={theme.colors.card} />
                ) : (
                  <Text style={styles.messageButtonText}>Messaggio</Text>
                )}
              </TouchableOpacity>
            ) : null}
            <View style={[styles.headerButtons, isRTL && styles.rowReverse]}>
              {['following', 'followers'].map((key) => {
                const label = key === 'following' ? 'Seguiti' : 'Seguaci';
                const countValue = key === 'following' ? followingCount : followersCount;
                const countLabel = canViewPrivate ? String(countValue ?? 0) : '—';
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => {
                      if (!canViewPrivate && !isSelf) {
                        setPrivacyHint('Segui questo utente per vedere seguiti e seguaci');
                        return;
                      }
                      setPrivacyHint('');
                      setActiveList((prev) => (prev === key ? null : key));
                    }}
                    style={[
                      styles.headerButton,
                      activeList === key && styles.headerButtonActive,
                      !canViewPrivate && !isSelf && styles.headerButtonDisabled,
                    ]}
                  >
                    <Text style={[styles.headerButtonText, activeList === key && styles.headerButtonTextActive]}>
                      {label}
                    </Text>
                    <Text style={[styles.headerCount, activeList === key && styles.headerCountActive]}>
                      {countLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.card}>
            <Text style={[styles.errorText, isRTL && styles.rtlText]}>{error.message}</Text>
          </View>
        ) : null}

        {!canViewPrivate && !isSelf ? (
          <View style={styles.card}>
            <Text style={[styles.mutedText, isRTL && styles.rtlText]}>
              {privacyHint || 'Segui questo utente per vedere post e connessioni.'}
            </Text>
          </View>
        ) : (
          <>
            {activeList === 'followers' ? (
              followersLoading && followers.length === 0 ? (
                <View style={styles.card}>
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={theme.colors.secondary} />
                    <Text style={[styles.mutedText, isRTL && styles.rtlText]}>Caricamento seguaci...</Text>
                  </View>
                </View>
              ) : followers.length === 0 ? (
                <View style={styles.card}>
                  <Text style={[styles.mutedText, isRTL && styles.rtlText]}>Nessun seguace.</Text>
                </View>
              ) : (
                <>
                  {followers.map((item) => (
                    <View key={item.id} style={[styles.followRow, isRTL && styles.rowReverse]}>
                      <TouchableOpacity
                        style={[styles.followInfo, isRTL && styles.rowReverse]}
                        onPress={() => navigation.navigate('PublicProfile', { profileId: item.id })}
                      >
                        <View style={styles.followAvatar}>
                          {item.avatarUrl ? (
                            <Image source={{ uri: item.avatarUrl }} style={styles.followAvatarImage} />
                          ) : (
                            <Text style={styles.followAvatarText}>
                              {getInitials(item.fullName || 'U')}
                            </Text>
                          )}
                        </View>
                        <View style={styles.followMeta}>
                          <Text style={[styles.followName, isRTL && styles.rtlText]}>{item.fullName}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.followButtonSmall,
                          followStatus[item.id] && styles.followButtonSmallActive,
                        ]}
                        onPress={() => toggleRowFollow(item.id)}
                        disabled={rowLoading[item.id]}
                      >
                        {rowLoading[item.id] ? (
                          <ActivityIndicator size="small" color={theme.colors.card} />
                        ) : (
                          <Text
                            style={[
                              styles.followButtonSmallText,
                              !followStatus[item.id] && styles.followButtonSmallTextInactive,
                            ]}
                          >
                            {followStatus[item.id] ? 'Seguito' : 'Segui'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                  {followersLoading ? (
                    <View style={styles.card}>
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color={theme.colors.secondary} />
                        <Text style={[styles.mutedText, isRTL && styles.rtlText]}>Caricamento...</Text>
                      </View>
                    </View>
                  ) : followersHasMore ? (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={() => setFollowersPage((prev) => prev + 1)}
                    >
                      <Text style={styles.loadMoreText}>Carica altri</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              )
            ) : null}

            {activeList === 'following' ? (
              followingLoading && following.length === 0 ? (
                <View style={styles.card}>
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={theme.colors.secondary} />
                    <Text style={[styles.mutedText, isRTL && styles.rtlText]}>Caricamento seguiti...</Text>
                  </View>
                </View>
              ) : following.length === 0 ? (
                <View style={styles.card}>
                  <Text style={[styles.mutedText, isRTL && styles.rtlText]}>Nessun seguito.</Text>
                </View>
              ) : (
                <>
                  {following.map((item) => (
                    <View key={item.id} style={[styles.followRow, isRTL && styles.rowReverse]}>
                      <TouchableOpacity
                        style={[styles.followInfo, isRTL && styles.rowReverse]}
                        onPress={() => navigation.navigate('PublicProfile', { profileId: item.id })}
                      >
                        <View style={styles.followAvatar}>
                          {item.avatarUrl ? (
                            <Image source={{ uri: item.avatarUrl }} style={styles.followAvatarImage} />
                          ) : (
                            <Text style={styles.followAvatarText}>
                              {getInitials(item.fullName || 'U')}
                            </Text>
                          )}
                        </View>
                        <View style={styles.followMeta}>
                          <Text style={[styles.followName, isRTL && styles.rtlText]}>{item.fullName}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.followButtonSmall,
                          followStatus[item.id] && styles.followButtonSmallActive,
                        ]}
                        onPress={() => toggleRowFollow(item.id)}
                        disabled={rowLoading[item.id]}
                      >
                        {rowLoading[item.id] ? (
                          <ActivityIndicator size="small" color={theme.colors.card} />
                        ) : (
                          <Text
                            style={[
                              styles.followButtonSmallText,
                              !followStatus[item.id] && styles.followButtonSmallTextInactive,
                            ]}
                          >
                            {followStatus[item.id] ? 'Seguito' : 'Segui'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                  {followingLoading ? (
                    <View style={styles.card}>
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color={theme.colors.secondary} />
                        <Text style={[styles.mutedText, isRTL && styles.rtlText]}>Caricamento...</Text>
                      </View>
                    </View>
                  ) : followingHasMore ? (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={() => setFollowingPage((prev) => prev + 1)}
                    >
                      <Text style={styles.loadMoreText}>Carica altri</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              )
            ) : null}

            {postsLoading && posts.length === 0 ? (
              <View style={styles.card}>
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.colors.secondary} />
                  <Text style={[styles.mutedText, isRTL && styles.rtlText]}>Caricamento post...</Text>
                </View>
              </View>
            ) : posts.length === 0 ? (
              <View style={styles.card}>
                <Text style={[styles.mutedText, isRTL && styles.rtlText]}>Nessun post ancora.</Text>
              </View>
            ) : (
              <>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} isRTL={isRTL} />
                ))}
                {postsLoading ? (
                  <View style={styles.card}>
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={theme.colors.secondary} />
                      <Text style={[styles.mutedText, isRTL && styles.rtlText]}>Caricamento...</Text>
                    </View>
                  </View>
                ) : postsHasMore ? (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => setPostsPage((prev) => prev + 1)}
                  >
                    <Text style={styles.loadMoreText}>Carica altri</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  webScrollView: {
    width: '100%',
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    flexGrow: 1,
  },
  webContent: {
    paddingLeft: theme.spacing.lg + WEB_TAB_BAR_WIDTH,
    paddingRight: theme.spacing.lg + WEB_SIDE_MENU_WIDTH,
    minHeight: '100%',
  },
  headerCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    ...theme.shadow.card,
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  avatarBorder: {
    padding: 4,
    borderRadius: 64,
    backgroundColor: theme.colors.surfaceMuted,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.colors.card,
    fontWeight: '800',
    fontSize: 24,
  },
  headerMeta: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    ...theme.shadow.card,
    gap: theme.spacing.sm,
  },
  mutedText: {
    color: theme.colors.muted,
    lineHeight: 20,
  },
  bioBlock: {
    marginTop: theme.spacing.sm,
  },
  bioPlaceholder: {
    color: theme.colors.muted,
    lineHeight: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  headerButtonActive: {
    backgroundColor: theme.colors.secondary,
  },
  headerButtonDisabled: {
    opacity: 0.6,
  },
  headerButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  headerButtonTextActive: {
    color: theme.colors.card,
  },
  headerCount: {
    color: theme.colors.muted,
    fontWeight: '700',
  },
  headerCountActive: {
    color: theme.colors.card,
  },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  followInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  followAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followAvatarText: {
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  followAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  followMeta: {
    flex: 1,
    gap: 2,
  },
  followName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  followButtonSmall: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  followButtonSmallActive: {
    backgroundColor: theme.colors.primary,
  },
  followButtonSmallText: {
    color: theme.colors.card,
    fontWeight: '700',
  },
  followButtonSmallTextInactive: {
    color: theme.colors.text,
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  loadMoreText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  bio: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  followButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.secondary,
  },
  followButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  followButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  messageButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
  },
  messageButtonDisabled: {
    opacity: 0.7,
  },
  messageButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});

export default PublicProfileScreen;
