import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Navbar from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';
import theme from '../styles/theme';
import { supabase } from '../lib/supabase';
import WebSidebar, { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';
import useSession from '../auth/useSession';
import useProfile from '../profile/useProfile';
import { usePosts } from '../context/PostsContext';
import PostCard from '../components/PostCard';

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const ProfileScreen = () => {
  const { strings, isRTL, language } = useLanguage();
  const isWeb = Platform.OS === 'web';
  const menuStrings = strings.menu;
  const navigation = useNavigation();
  const sidebarTitle = strings.home?.greeting || menuStrings.userProfile;
  const { user } = useSession();
  const { profile, loading, error, updateProfile, refresh } = useProfile();
  const { posts, createPost } = usePosts();
  const [fullNameInput, setFullNameInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [avatarError, setAvatarError] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImageUri, setPostImageUri] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);
  const hasSyncedLanguage = useRef(false);

  useEffect(() => {
    setFullNameInput(profile?.full_name ?? '');
    setAvatarInput(profile?.avatar_url ?? '');
    setBioInput(profile?.bio ?? '');
  }, [profile?.full_name, profile?.avatar_url, profile?.bio]);

  const initials = (profile?.full_name || strings.menu?.userProfile || 'Profilo')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const languageLabels = {
    it: strings.language?.italian || 'Italiano',
    ar: strings.language?.arabic || 'Arabo',
  };
  const currentLanguageLabel = languageLabels[language] || language || '-';

  useEffect(() => {
    if (!user || !profile) return;
    if (!language) return;

    const profileLanguage = profile.language ?? '';
    if (!hasSyncedLanguage.current) {
      hasSyncedLanguage.current = true;
      if (language === profileLanguage) return;
    }

    if (language === profileLanguage) return;

    const syncLanguage = async () => {
      try {
        await updateProfile({ language });
      } catch (updateError) {
        setValidationError(updateError);
      }
    };

    syncLanguage();
  }, [language, profile, updateProfile, user]);

  const handleSaveProfile = async () => {
    if (!isEditing) return;
    if (saving) return;
    setValidationError(null);
    if (!user) {
      setValidationError(new Error('Utente non autenticato.'));
      return;
    }
    if (!isUuid(user.id)) {
      setValidationError(new Error('User ID non valido.'));
      return;
    }
    const trimmedFullName = String(fullNameInput ?? '').trim();
    if (!trimmedFullName) {
      setValidationError(new Error('Il nome completo non puo essere vuoto.'));
      return;
    }
    setSaving(true);
    const trimmedBio = String(bioInput ?? '').trim();
    const bioPayload = trimmedBio.length ? trimmedBio : null;
    try {
      await updateProfile({
        full_name: trimmedFullName,
        language: language,
        bio: bioPayload,
      });
      setIsEditing(false);
    } catch (updateError) {
      Alert.alert('Errore', updateError.message);
    }
    setSaving(false);
  };

  const handlePickImage = async () => {
    if (!isEditing) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permesso richiesto', "Concedi l'accesso alle foto per aggiornare l'immagine profilo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.length) {
      const selectedUri = result.assets[0].uri;
      await uploadAvatar(selectedUri);
    }
  };

  const handlePickPostImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permesso richiesto', "Concedi l'accesso alle foto per aggiungere un media.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.length) {
      setPostImageUri(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (posting) return;
    setPostError(null);
    setPosting(true);
    const { error: createError } = await createPost({
      content: postContent,
      mediaUri: postImageUri || null,
    });
    if (createError) {
      setPostError(createError);
    } else {
      setPostContent('');
      setPostImageUri('');
    }
    setPosting(false);
  };

  const userPosts = useMemo(() => posts.filter((post) => post.authorId === user?.id), [posts, user?.id]);

  const uploadAvatar = async (uri) => {
    if (!user) {
      setAvatarError(new Error('Utente non autenticato.'));
      return;
    }
    if (!uri) return;
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, {
        upsert: true,
        contentType: blob.type || 'image/jpeg',
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        throw new Error('Impossibile ottenere URL pubblico.');
      }

      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      setAvatarInput(publicUrl);
      if (updated) {
        await refresh();
      }
    } catch (uploadError) {
      setAvatarError(uploadError);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const deleteAvatar = async () => {
    if (!user) {
      setAvatarError(new Error('Utente non autenticato.'));
      return;
    }
    setAvatarError(null);
    setDeletingAvatar(true);
    try {
      const path = `${user.id}/avatar.jpg`;
      const { error: removeError } = await supabase.storage.from('avatars').remove([path]);
      if (removeError) {
        throw removeError;
      }

      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      setAvatarInput('');
      if (updated) {
        await refresh();
      }
    } catch (removeError) {
      setAvatarError(removeError);
    } finally {
      setDeletingAvatar(false);
    }
  };


  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.safeAreaWeb]}>
      <Navbar title={menuStrings.userProfile} isRTL={isRTL} />
      <ScrollView contentContainerStyle={[styles.content, isWeb && styles.webContent]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={[styles.avatarWrapper, isRTL && styles.rowReverse]}>
            <View style={styles.avatarBorder}>
              {avatarInput ? (
                <Image source={{ uri: avatarInput }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: theme.colors.secondary }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerMeta}>
              <Text style={[styles.name, isRTL && styles.rtlText]}>
                {profile?.full_name || strings.menu?.userProfile || 'Profilo'}
              </Text>
              {profile?.bio ? (
                <Text style={[styles.bio, isRTL && styles.rtlText]}>{profile.bio}</Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.actionsRow, isRTL && styles.rowReverse]}>
            <TouchableOpacity
              style={[styles.contactsButton, isRTL && styles.rowReverse]}
              onPress={() => navigation.navigate('Contacts')}
            >
              <Ionicons name="people" size={16} color={theme.colors.secondary} />
              <Text style={[styles.contactsButtonText, isRTL && styles.rtlText]}>Contatti</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editButton, isEditing && styles.editButtonDisabled]}
              onPress={() => setIsEditing(true)}
              disabled={isEditing}
            >
              <Ionicons name="create" size={16} color={theme.colors.card} />
              <Text style={styles.editButtonText}>Modifica profilo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          {isEditing ? (
            <View style={styles.editForm}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>Aggiorna profilo</Text>
              <View style={styles.fieldRow}>
                <Text style={[styles.label, isRTL && styles.rtlText]}>Immagine profilo</Text>
                <View style={[styles.uploadRow, isRTL && styles.rowReverse]}>
                  <TouchableOpacity
                    style={[styles.uploadButton, (uploadingAvatar || deletingAvatar) && styles.uploadButtonDisabled]}
                    onPress={handlePickImage}
                    disabled={uploadingAvatar || deletingAvatar}
                  >
                    {uploadingAvatar ? (
                      <ActivityIndicator size="small" color={theme.colors.card} />
                    ) : (
                      <Ionicons name="cloud-upload" size={18} color={theme.colors.card} />
                    )}
                    <Text style={styles.uploadButtonText}>Cambia foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.removeButton, (uploadingAvatar || deletingAvatar) && styles.uploadButtonDisabled]}
                    onPress={deleteAvatar}
                    disabled={uploadingAvatar || deletingAvatar}
                  >
                    {deletingAvatar ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <Ionicons name="trash" size={18} color={theme.colors.primary} />
                    )}
                    <Text style={styles.removeButtonText}>Rimuovi foto</Text>
                  </TouchableOpacity>
                  {avatarInput ? (
                    <Image source={{ uri: avatarInput }} style={styles.preview} />
                  ) : (
                    <View style={[styles.preview, styles.previewFallback]}>
                      <Ionicons name="image" size={18} color={theme.colors.muted} />
                    </View>
                  )}
                </View>
                {avatarError ? (
                  <Text style={[styles.errorText, isRTL && styles.rtlText]}>{avatarError.message}</Text>
                ) : null}
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.label, isRTL && styles.rtlText]}>Nome completo</Text>
                <TextInput
                  style={[styles.input, isRTL && styles.rtlText]}
                  value={fullNameInput}
                  onChangeText={setFullNameInput}
                  placeholder="Inserisci il tuo nome completo"
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.label, isRTL && styles.rtlText]}>Lingua</Text>
                <View style={[styles.languageRow, isRTL && styles.rowReverse]}>
                  <Text style={[styles.languageValue, isRTL && styles.rtlText]}>{currentLanguageLabel}</Text>
                  <TouchableOpacity
                    style={styles.languageButton}
                    onPress={() => navigation.navigate('Lingua')}
                  >
                    <Ionicons name="globe" size={16} color={theme.colors.card} />
                    <Text style={styles.languageButtonText}>Cambia lingua</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.label, isRTL && styles.rtlText]}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.multiline, isRTL && styles.rtlText]}
                  value={bioInput}
                  onChangeText={(text) => setBioInput(text.slice(0, 200))}
                  multiline
                  placeholder="Racconta qualcosa su di te"
                  maxLength={200}
                />
                <Text style={[styles.charCount, isRTL && styles.rtlText]}>
                  {bioInput.length}/200
                </Text>
              </View>
              {validationError ? (
                <Text style={[styles.errorText, isRTL && styles.rtlText]}>{validationError.message}</Text>
              ) : null}
              {error ? (
                <Text style={[styles.errorText, isRTL && styles.rtlText]}>{error.message}</Text>
              ) : null}
              {loading ? (
                <View style={[styles.loadingRow, isRTL && styles.rowReverse]}>
                  <ActivityIndicator size="small" color={theme.colors.secondary} />
                  <Text style={[styles.loadingText, isRTL && styles.rtlText]}>Caricamento profilo...</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={[styles.saveButton, (saving || loading) && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={saving || loading}
              >
                <Ionicons name="save" size={18} color={theme.colors.card} />
                <Text style={styles.saveButtonText}>{saving ? 'Salvataggio...' : 'Salva'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>Crea un post</Text>
          <View style={styles.fieldRow}>
            <Text style={[styles.label, isRTL && styles.rtlText]}>Testo</Text>
            <TextInput
              style={[styles.input, styles.multiline, isRTL && styles.rtlText]}
              value={postContent}
              onChangeText={(text) => setPostContent(text.slice(0, 500))}
              multiline
              placeholder="Condividi qualcosa con la community..."
              maxLength={500}
            />
            <Text style={[styles.charCount, isRTL && styles.rtlText]}>
              {postContent.length}/500
            </Text>
          </View>
          <View style={[styles.uploadRow, isRTL && styles.rowReverse]}>
            <TouchableOpacity
              style={[styles.uploadButton, posting && styles.uploadButtonDisabled]}
              onPress={handlePickPostImage}
              disabled={posting}
            >
              <Ionicons name="image" size={18} color={theme.colors.card} />
              <Text style={styles.uploadButtonText}>Aggiungi media</Text>
            </TouchableOpacity>
            {postImageUri ? (
              <Image source={{ uri: postImageUri }} style={styles.preview} />
            ) : (
              <View style={[styles.preview, styles.previewFallback]}>
                <Ionicons name="image" size={18} color={theme.colors.muted} />
              </View>
            )}
          </View>
          {postError ? (
            <Text style={[styles.errorText, isRTL && styles.rtlText]}>{postError.message}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.saveButton, (posting || !postContent.trim()) && styles.saveButtonDisabled]}
            onPress={handleCreatePost}
            disabled={posting || !postContent.trim()}
          >
            {posting ? (
              <ActivityIndicator size="small" color={theme.colors.card} />
            ) : (
              <Ionicons name="send" size={18} color={theme.colors.card} />
            )}
            <Text style={styles.saveButtonText}>{posting ? 'Pubblicazione...' : 'Pubblica'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>I tuoi post</Text>
          {userPosts.length === 0 ? (
            <Text style={[styles.emptyText, isRTL && styles.rtlText]}>Non hai ancora pubblicato post.</Text>
          ) : (
            userPosts.map((post) => (
              <View key={post.id} style={styles.postBlock}>
                <PostCard post={post} isRTL={isRTL} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <WebSidebar
        title={sidebarTitle}
        menuStrings={menuStrings}
        navigation={navigation}
        isRTL={isRTL}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeAreaWeb: {
    paddingLeft: WEB_TAB_BAR_WIDTH,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  webContent: {
    paddingRight: theme.spacing.lg + WEB_SIDE_MENU_WIDTH,
    paddingLeft: theme.spacing.lg + WEB_TAB_BAR_WIDTH,
  },
  headerCard: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.card,
    gap: theme.spacing.sm,
  },
  avatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarBorder: {
    padding: 4,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: {
    color: theme.colors.card,
    fontSize: 22,
    fontWeight: '800',
  },
  bio: {
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  username: {
    color: 'rgba(255,255,255,0.85)',
  },
  contactsButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: theme.radius.md,
  },
  contactsButtonText: {
    color: theme.colors.card,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.card,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
  },
  editButtonDisabled: {
    opacity: 0.6,
  },
  editButtonText: {
    color: theme.colors.card,
    fontWeight: '700',
  },
  editForm: {
    gap: theme.spacing.md,
  },
  fieldRow: {
    gap: 6,
  },
  label: {
    color: theme.colors.muted,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(12,27,51,0.1)',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: 'rgba(12,27,51,0.02)',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  languageValue: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
  },
  languageButtonText: {
    color: theme.colors.card,
    fontWeight: '700',
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: theme.colors.card,
    fontWeight: '700',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(215,35,35,0.4)',
    backgroundColor: 'rgba(215,35,35,0.08)',
  },
  removeButtonText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  preview: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(12,27,51,0.1)',
  },
  previewFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,27,51,0.02)',
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  charCount: {
    color: theme.colors.muted,
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  errorText: {
    color: theme.colors.danger || '#d64545',
    fontWeight: '600',
  },
  emptyText: {
    color: theme.colors.muted,
  },
  postBlock: {
    gap: theme.spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    color: theme.colors.muted,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  saveButtonText: {
    color: theme.colors.card,
    fontWeight: '700',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});

export default ProfileScreen;
