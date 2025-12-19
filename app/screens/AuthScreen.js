import React, { useState } from 'react';
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
import { signIn, signUp } from '../auth/authApi';
import theme from '../styles/theme';

const AuthScreen = () => {
  const [mode, setMode] = useState('start');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage('');
  };

  const enterMode = (nextMode) => {
    resetForm();
    setMode(nextMode);
  };

  const handleAuth = async (mode) => {
    if (!email.trim() || !password) {
      setErrorMessage('Inserisci email e password.');
      return;
    }

    if (mode === 'signup') {
      if (!confirmPassword) {
        setErrorMessage('Conferma la password.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Le password non corrispondono.');
        return;
      }
    }

    setLoading(true);
    setErrorMessage('');

    const action = mode === 'signup' ? signUp : signIn;
    const { error } = await action(email.trim(), password);

    if (error) {
      setErrorMessage(error.message);
    }

    setLoading(false);
  };

  if (mode === 'start') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.startContainer}>
          <Text style={styles.title}>TwensAi</Text>
          <Text style={styles.subtitle}>Accedi o crea un account</Text>
          <View style={styles.startActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => enterMode('signin')}>
              <Text style={styles.primaryButtonText}>Accedi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => enterMode('signup')}>
              <Text style={styles.secondaryButtonText}>Registrati</Text>
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
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => enterMode('start')} disabled={loading}>
              <Ionicons name="arrow-back" size={20} color={theme.colors.secondary} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{mode === 'signup' ? 'Registrati' : 'Accedi'}</Text>
              <Text style={styles.subtitle}>
                {mode === 'signup' ? 'Crea il tuo account TwensAi' : 'Accedi con email e password'}
              </Text>
            </View>
          </View>

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
              />
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowPassword((prev) => !prev)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'signup' ? (
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
                />
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={() => handleAuth(mode)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.card} />
            ) : (
              <Text style={styles.primaryButtonText}>{mode === 'signup' ? 'Registrati' : 'Accedi'}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, loading && styles.buttonDisabled]}
            onPress={() => enterMode(mode === 'signup' ? 'signin' : 'signup')}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>
              {mode === 'signup' ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
            </Text>
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
  startContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  startActions: {
    width: '100%',
    maxWidth: 360,
    gap: theme.spacing.sm,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 26,
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
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIconPadding: {
    flex: 1,
    paddingRight: 44,
  },
  iconButton: {
    position: 'absolute',
    right: 12,
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#B91C1C',
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.secondary,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default AuthScreen;
