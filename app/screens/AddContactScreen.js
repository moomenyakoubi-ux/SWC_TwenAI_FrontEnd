import React, { useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import { useContacts } from '../context/ContactsContext';

const AddContactScreen = () => {
  const { strings, isRTL } = useLanguage();
  const menuStrings = strings.menu;
  const navigation = useNavigation();
  const route = useRoute();
  const { profiles, toggleContact } = useContacts();
  const showContactsOnly = route.params?.showContactsOnly === true;
  const [query, setQuery] = useState('');
  const baseList = useMemo(
    () => (showContactsOnly ? profiles.filter((profile) => profile.isContact) : profiles),
    [profiles, showContactsOnly],
  );
  const filtered = useMemo(
    () =>
      baseList.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.city.toLowerCase().includes(query.toLowerCase()) ||
        item.interests.toLowerCase().includes(query.toLowerCase()),
      ),
    [baseList, query],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Navbar
        title={menuStrings.addContact}
        isRTL={isRTL}
        onBack={() => navigation.goBack()}
        backLabel={strings.tabs.home}
      />
      <View style={styles.container}>
        <View style={[styles.searchBox, isRTL && styles.rowReverse]}>
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.rtlText]}
            placeholder="Cerca per nome, città o interessi"
            placeholderTextColor={theme.colors.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, isRTL && styles.rowReverse]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PublicProfile', { profileId: item.id })}
            >
              <View style={[styles.avatar, { backgroundColor: 'rgba(12,27,51,0.08)' }]}>
                <Text style={styles.avatarText}>{item.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, isRTL && styles.rtlText]}>{item.name}</Text>
                <Text style={[styles.meta, isRTL && styles.rtlText]}>{item.city} • {item.interests}</Text>
              </View>
              <TouchableOpacity
                style={[styles.addButton, item.isContact && styles.removeButton]}
                onPress={() => toggleContact(item.id)}
              >
                <Ionicons
                  name={item.isContact ? 'close' : 'link'}
                  size={18}
                  color={theme.colors.card}
                />
                <Text style={styles.addButtonText}>{item.isContact ? 'Rimuovi' : 'Collegati'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
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
