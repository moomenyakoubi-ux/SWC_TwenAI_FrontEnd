import React, { useMemo } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Navbar from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';
import { useContacts } from '../context/ContactsContext';
import theme from '../styles/theme';
import PostCard from '../components/PostCard';

const PublicProfileScreen = ({ route, navigation }) => {
  const { strings, isRTL } = useLanguage();
  const profileId = route.params?.profileId;
  const { profiles, setContactStatus } = useContacts();

  const profile = useMemo(() => {
    const fallback =
      profiles[0] ||
      ({
        id: 'fallback',
        name: 'Profilo dimostrativo',
        username: '@profilo',
        handle: '@profilo',
        avatarColor: theme.colors.primary,
        bio: '',
        city: '',
        interests: '',
        posts: [],
        isContact: false,
      });

    return profiles.find((item) => item.id === profileId) ?? fallback;
  }, [profileId, profiles]);

  const initials = useMemo(
    () =>
      profile.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [profile.name],
  );

  const profileStrings = strings.profiles ?? {};
  const canViewProfile = profile?.isContact === true;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Navbar
        title={profileStrings.title || strings.menu.userProfile}
        isRTL={isRTL}
        onBack={() => navigation.goBack()}
        backLabel={strings.tabs.home}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerCard, isRTL && styles.rowReverse]}>
          <View style={styles.avatarBorder}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: profile.avatarColor }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerMeta}>
            <Text style={[styles.name, isRTL && styles.rtlText]}>{profile.name}</Text>
            <Text style={[styles.username, isRTL && styles.rtlText]}>{profile.username}</Text>
            <View
              style={[styles.contactPill, canViewProfile ? styles.contactActive : styles.contactLocked]}
            >
              <Text style={styles.contactPillText}>
                {canViewProfile
                  ? profileStrings.contactLabel || 'Nella tua lista contatti'
                  : profileStrings.closedProfile || 'Profilo chiuso'}
              </Text>
            </View>
          </View>
        </View>

        {!canViewProfile && (
          <>
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {profileStrings.infoTitle || 'Informazioni'}
              </Text>
              <Text style={[styles.bio, isRTL && styles.rtlText]}>{profile.bio}</Text>
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {profileStrings.closedProfile || 'Profilo chiuso'}
              </Text>
              <Text style={[styles.mutedText, isRTL && styles.rtlText]}>
                Questo profilo è privato.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setContactStatus(profile.id, true)}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>Collegati</Text>
              </TouchableOpacity>
              <Text style={[styles.helperText, isRTL && styles.rtlText]}>
                {profileStrings.fakeHint || 'Stiamo mostrando un profilo dimostrativo.'}
              </Text>
            </View>
          </>
        )}

        {canViewProfile && (
          <>
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {profileStrings.infoTitle || 'Informazioni'}
              </Text>
              <View style={styles.infoRow}>
                <Text style={[styles.mutedText, isRTL && styles.rtlText]}>
                  {profileStrings.city || 'Città'}
                </Text>
                <Text style={[styles.infoText, isRTL && styles.rtlText]}>{profile.city}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.mutedText, isRTL && styles.rtlText]}>
                  {profileStrings.interests || 'Interessi'}
                </Text>
                <Text style={[styles.infoText, isRTL && styles.rtlText]}>{profile.interests}</Text>
              </View>
              <Text style={[styles.bio, isRTL && styles.rtlText]}>{profile.bio}</Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setContactStatus(profile.id, false)}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Rimuovi</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {profileStrings.postsTitle || 'Post recenti'}
              </Text>
              {profile.posts.map((post) => (
                <PostCard key={post.id} post={post} isRTL={isRTL} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  headerCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.card,
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  avatarBorder: {
    padding: 4,
    borderRadius: 64,
    backgroundColor: 'rgba(12,27,51,0.06)',
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
  username: {
    color: theme.colors.muted,
  },
  contactPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 18,
    marginTop: theme.spacing.xs,
  },
  contactActive: {
    backgroundColor: 'rgba(12,27,51,0.08)',
  },
  contactLocked: {
    backgroundColor: 'rgba(215,35,35,0.12)',
  },
  contactPillText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.card,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  mutedText: {
    color: theme.colors.muted,
    lineHeight: 20,
  },
  helperText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoText: {
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
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  primaryButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: 'rgba(12,27,51,0.08)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
  },
});

export default PublicProfileScreen;
