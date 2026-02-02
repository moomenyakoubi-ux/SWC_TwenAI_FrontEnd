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
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';
import { supabase } from '../lib/supabase';

const SESSION_TIMEOUT_MS = 9000;

const getReadableSupabaseError = (error) => {
  if (!error?.message) return 'Si è verificato un errore. Riprova.';
  const message = error.message.toLowerCase();
  if (message.includes('password')) return 'La password non rispetta i requisiti richiesti.';
  if (message.includes('session')) return 'Sessione non valida. Richiedi un nuovo link.';
  return error.message;
};

const UpdatePasswordScreen = ({ session, onBackToLogin }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [recoverySessionReady, setRecoverySessionReady] = useState(false);
  const timeoutRef = useRef(null);
  const recoveryReadyRef = useRef(false);

  const markRecoveryReady = (value) => {
    recoveryReadyRef.current = value;
    setRecoverySessionReady(value);
    if (value) {
      setErrorMessage('');
    }
  };

  useEffect(() => {
    let isMounted = true;

    setVerifying(true);

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;
      if (nextSession || event === 'PASSWORD_RECOVERY') {
        markRecoveryReady(true);
        setVerifying(false);
      }
    });

    const syncSession = async () => {
      if (session) {
        markRecoveryReady(true);
        setVerifying(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (data?.session) {
        markRecoveryReady(true);
        setVerifying(false);
        return;
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const rawHash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;
        const params = new URLSearchParams(rawHash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const type = params.get('type');
        if (access_token && refresh_token && type === 'recovery') {
          await supabase.auth.setSession({ access_token, refresh_token });
          const { data: fallbackData } = await supabase.auth.getSession();
          if (!isMounted) return;
          if (fallbackData?.session) {
            markRecoveryReady(true);
            setVerifying(false);
          }
        }
      }
    };

    syncSession();

    timeoutRef.current = setTimeout(() => {
      if (!isMounted) return;
      if (!recoveryReadyRef.current) {
        setErrorMessage('Link non valido o scaduto. Rifai "Forgot password".');
        setVerifying(false);
      }
    }, SESSION_TIMEOUT_MS);

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      authListener?.subscription?.unsubscribe();
    };
  }, [session]);

  const handleSubmit = async () => {
    if (password.length < 8) {
      setErrorMessage('La password deve avere almeno 8 caratteri.');
      setSuccessMessage('');
      return;
    }
    if (!confirmPassword) {
      setErrorMessage('Conferma la password.');
      setSuccessMessage('');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Le password non corrispondono.');
      setSuccessMessage('');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(getReadableSupabaseError(error));
      setLoading(false);
      return;
    }

    setSuccessMessage('Password aggiornata. Ora puoi fare login.');
    setLoading(false);
    timeoutRef.current = setTimeout(async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        onBackToLogin();
      }
    }, 1500);
  };

  if (verifying) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.card}>
            <ActivityIndicator size="large" color={theme.colors.secondary} />
            <Text style={styles.title}>Verifica link in corso...</Text>
            <Text style={styles.subtitle}>Attendi qualche secondo.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!recoverySessionReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>
              {errorMessage || 'Link non valido o scaduto. Rifai "Forgot password".'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const formDisabled = loading || Boolean(successMessage);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          {!successMessage ? (
            <>
              <Text style={styles.title}>Imposta nuova password</Text>
              <Text style={styles.subtitle}>Scegli una password sicura e confermala.</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={[styles.input, styles.inputIconPadding]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••"
                    placeholderTextColor={theme.colors.muted}
                    editable={!formDisabled}
                  />
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setShowPassword((prev) => !prev)}
                    disabled={formDisabled}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.muted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Conferma password</Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={[styles.input, styles.inputIconPadding]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor={theme.colors.muted}
                    editable={!formDisabled}
                  />
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={formDisabled}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.muted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

              <TouchableOpacity
                style={[styles.primaryButton, formDisabled && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={formDisabled}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.card} />
                ) : (
                  <Text style={styles.primaryButtonText}>Aggiorna password</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.status}>{successMessage}</Text>
          )}
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
  inputWithIcon: {
    position: 'relative',
    justifyContent: 'center',
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
  inputIconPadding: {
    paddingRight: 44,
  },
  iconButton: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
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
