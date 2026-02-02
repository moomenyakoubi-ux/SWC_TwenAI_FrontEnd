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
  const [activeSession, setActiveSession] = useState(session || null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (session) {
      setActiveSession(session);
      setCheckingSession(false);
    }
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    const timeoutId = setTimeout(() => {
      if (isMounted) setTimedOut(true);
    }, SESSION_TIMEOUT_MS);

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (data?.session) {
        setActiveSession(data.session);
        setCheckingSession(false);
        return;
      }
      if (error) {
        setErrorMessage(getReadableSupabaseError(error));
      }
      setCheckingSession(false);
    };

    syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoverySession(true);
        setRecoveryChecked(true);
      }
      if (event === 'PASSWORD_RECOVERY' || nextSession) {
        setActiveSession(nextSession);
        setCheckingSession(false);
        setTimedOut(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const hash = window.location?.hash ? window.location.hash.slice(1) : '';
    const search = window.location?.search ? window.location.search.slice(1) : '';
    const params = new URLSearchParams([search, hash].filter(Boolean).join('&'));
    if (params.get('type') === 'recovery') {
      setIsRecoverySession(true);
    }
    setRecoveryChecked(true);
  }, []);

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

  const shouldShowLoader = (checkingSession || !recoveryChecked) && !timedOut;
  const shouldBlockForm = !activeSession?.user || !isRecoverySession;

  if (shouldBlockForm) {
    if (shouldShowLoader) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={styles.card}>
              <ActivityIndicator size="large" color={theme.colors.secondary} />
              <Text style={styles.title}>Sto verificando il link...</Text>
              <Text style={styles.subtitle}>Attendi qualche secondo.</Text>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Link non valido o scaduto. Rifai "Forgot password".</Text>
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
