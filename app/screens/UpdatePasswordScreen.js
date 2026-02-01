import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import theme from '../styles/theme';
import { supabase } from '../lib/supabase';

const getReadableSupabaseError = (error) => {
  if (!error?.message) return "Si e' verificato un errore. Riprova.";
  const message = error.message.toLowerCase();
  if (message.includes('password')) return 'La password non rispetta i requisiti.';
  if (message.includes('session')) return 'Sessione non valida. Richiedi un nuovo link.';
  return error.message;
};

const UpdatePasswordScreen = ({ session, onBackToLogin }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (password.length < 8) {
      setErrorMessage('La password deve avere almeno 8 caratteri.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Le password non corrispondono.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(getReadableSupabaseError(error));
      setLoading(false);
      return;
    }

    setStatusMessage('Password aggiornata con successo');
    setLoading(false);
    timeoutRef.current = setTimeout(async () => {
      await supabase.auth.signOut();
      onBackToLogin();
    }, 1500);
  };

  if (!session?.user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Link non valido o scaduto</Text>
            <Text style={styles.subtitle}>
              Il link potrebbe essere gia usato o non piu valido. Richiedi un nuovo link.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={onBackToLogin}>
              <Text style={styles.primaryButtonText}>Torna al login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Imposta nuova password</Text>
          <Text style={styles.subtitle}>Scegli una password sicura e confermala.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nuova password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Minimo 8 caratteri"
              placeholderTextColor={theme.colors.muted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Conferma password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Ripeti la password"
              placeholderTextColor={theme.colors.muted}
            />
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.card} />
            ) : (
              <Text style={styles.primaryButtonText}>Aggiorna password</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.md,
    ...theme.shadow.card,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  subtitle: {
    color: theme.colors.muted,
  },
  field: {
    gap: 6,
  },
  label: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: 'rgba(12,27,51,0.02)',
  },
  error: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  status: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.card,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default UpdatePasswordScreen;
