import React, { useMemo, useState } from 'react';
import {
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
import PostCard from '../components/PostCard';
import fakePosts from '../data/fakePosts';
import WebSidebar, { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';

const ProfileScreen = () => {
  const { strings, isRTL } = useLanguage();
  const isWeb = Platform.OS === 'web';
  const menuStrings = strings.menu;
  const navigation = useNavigation();
  const sidebarTitle = strings.home?.greeting || menuStrings.userProfile;
  const [profile, setProfile] = useState({
    name: 'Utente Ahna',
    username: '@ahna_user',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bio: 'Costruisco ponti tra Tunisia e Italia. Amante della cucina tunisina e delle community vibranti.',
  });
  const [avatarInput, setAvatarInput] = useState(profile.avatar);
  const [nameInput, setNameInput] = useState(profile.name);
  const [bioInput, setBioInput] = useState(profile.bio);
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState(fakePosts);
  const [isEditing, setIsEditing] = useState(false);

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

  const handleSaveProfile = () => {
    if (!isEditing) return;
    setProfile((prev) => ({
      ...prev,
      name: nameInput.trim() || prev.name,
      avatar: avatarInput.trim() || prev.avatar,
      bio: bioInput.trim(),
    }));
    setIsEditing(false);
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
      setAvatarInput(result.assets[0].uri);
    }
  };

  const handleAddPost = () => {
    if (!newPost.trim()) return;
    const freshPost = {
      id: `user-${Date.now()}`,
      author: profile.name,
      handle: profile.username,
      avatarColor: '#0C1B33',
      time: 'ora',
      content: newPost.trim(),
      reactions: 0,
      comments: 0,
    };
    setPosts((prev) => [freshPost, ...prev]);
    setNewPost('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Navbar title={menuStrings.userProfile} isRTL={isRTL} />
      <ScrollView contentContainerStyle={[styles.content, isWeb && styles.webContent]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={[styles.avatarWrapper, isRTL && styles.rowReverse]}>
            <View style={styles.avatarBorder}>
              {profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: theme.colors.secondary }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerMeta}>
              <Text style={[styles.name, isRTL && styles.rtlText]}>{profile.name}</Text>
              <Text style={[styles.username, isRTL && styles.rtlText]}>{profile.username}</Text>
              <Text style={[styles.bio, isRTL && styles.rtlText]}>{profile.bio}</Text>
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
          {isEditing && (
            <View style={styles.editForm}>
              <View style={styles.fieldRow}>
                <Text style={[styles.label, isRTL && styles.rtlText]}>Immagine profilo</Text>
                <View style={[styles.uploadRow, isRTL && styles.rowReverse]}>
                  <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
                    <Ionicons name="cloud-upload" size={18} color={theme.colors.card} />
                    <Text style={styles.uploadButtonText}>Carica da dispositivo</Text>
                  </TouchableOpacity>
                  {avatarInput ? (
                    <Image source={{ uri: avatarInput }} style={styles.preview} />
                  ) : (
                    <View style={[styles.preview, styles.previewFallback]}>
                      <Ionicons name="image" size={18} color={theme.colors.muted} />
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.label, isRTL && styles.rtlText]}>Nome utente</Text>
                <TextInput
                  style={[styles.input, isRTL && styles.rtlText]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Inserisci il tuo nome"
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.label, isRTL && styles.rtlText]}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.multiline, isRTL && styles.rtlText]}
                  value={bioInput}
                  onChangeText={setBioInput}
                  multiline
                  placeholder="Racconta qualcosa su di te"
                />
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Ionicons name="save" size={18} color={theme.colors.card} />
                <Text style={styles.saveButtonText}>Salva impostazioni</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>Pubblica un aggiornamento</Text>
          <View style={[styles.newPostRow, isRTL && styles.rowReverse]}>
            <TextInput
              style={[styles.input, styles.newPostInput, isRTL && styles.rtlText]}
              value={newPost}
              onChangeText={setNewPost}
              placeholder="Scrivi qualcosa per la community..."
              multiline
            />
            <TouchableOpacity style={styles.postButton} onPress={handleAddPost}>
              <Ionicons name="add-circle" size={22} color={theme.colors.card} />
              <Text style={styles.postButtonText}>Pubblica</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>I tuoi post</Text>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} isRTL={isRTL} />
          ))}
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
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  webContent: {
    paddingRight: theme.spacing.lg + WEB_SIDE_MENU_WIDTH,
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
  username: {
    color: 'rgba(255,255,255,0.85)',
  },
  bio: {
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
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
  editButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  editCopy: {
    flex: 1,
    gap: 4,
  },
  editDescription: {
    color: theme.colors.muted,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  fieldRow: {
    gap: 6,
  },
  label: {
    color: theme.colors.muted,
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
  uploadButtonText: {
    color: theme.colors.card,
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
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
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
  newPostRow: {
    gap: theme.spacing.sm,
  },
  newPostInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  postButtonText: {
    color: theme.colors.card,
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
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});

export default ProfileScreen;
