import React, { useEffect, useState } from 'react';
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
import * as Linking from 'expo-linking';
import theme from '../styles/theme';
import { supabase } from '../lib/supabase';

const SUCCESS_MESSAGE = "Se l'email esiste, ti abbiamo inviato un link per reimpostare la password.";

const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

const getReadableSupabaseError = (error) => {
  if (!error?.message) return 'Si è verificato un errore. Riprova.';
  const message = error.message.toLowerCase();
  if (error.status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
    return 'Troppi tentativi. Riprova tra qualche minuto.';
  }
  if (message.includes('invalid') && message.includes('email')) {
    return "Controlla che l'email sia corretta.";
  }
  return error.message;
};

function buildResetRedirectUrl() {
  if (Platform.OS === 'web') {
    return `${window.location.origin}/auth/update-password`;
  }
  return Linking.createURL('auth/update-password');
}

const ForgotPasswordScreen = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const intervalId = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [cooldownSeconds]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage('Inserisci un indirizzo email valido.');
      setStatusMessage('');
      return;
    }

    if (cooldownSeconds > 0) {
      setErrorMessage(`Attendi ${cooldownSeconds} secondi prima di riprovare.`);
      setStatusMessage('');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    const redirectTo = buildResetRedirectUrl();
    if (Platform.OS === 'web' && !redirectTo.startsWith('http')) {
      throw new Error('redirectTo must be absolute on web');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });

    if (error) {
      console.log('[forgot-password] reset error:', error.message);
      setErrorMessage(getReadableSupabaseError(error));
    } else {
      setStatusMessage(SUCCESS_MESSAGE);
    }

    setLoading(false);
    setCooldownSeconds(60);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Recupera password</Text>
          <Text style={styles.subtitle}>Inserisci la tua email per ricevere il link.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="email@esempio.com"
              placeholderTextColor={theme.colors.muted}
            />
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (loading || cooldownSeconds > 0 || email.trim().length === 0) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || cooldownSeconds > 0 || email.trim().length === 0}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.card} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {cooldownSeconds > 0 ? `Riprova tra ${cooldownSeconds}s` : 'Invia link reset'}
              </Text>
            )}
          </TouchableOpacity>

          {cooldownSeconds > 0 ? (
            <Text style={styles.cooldown}>Puoi riprovare tra {cooldownSeconds} secondi.</Text>
          ) : null}

          <TouchableOpacity style={styles.linkButton} onPress={onBackToLogin} disabled={loading}>
            <Text style={styles.linkText}>Torna al login</Text>
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
  cooldown: {
    color: theme.colors.muted,
    fontWeight: '600',
    textAlign: 'center',
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
  linkButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    color: theme.colors.secondary,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default ForgotPasswordScreen;
