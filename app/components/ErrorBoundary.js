import React from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import theme from '../styles/theme';
import { WEB_TAB_BAR_WIDTH } from './WebTabBar';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }

  handleBack = () => {
    const { onBack } = this.props;
    if (onBack) {
      onBack();
    }
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children } = this.props;
    const isWeb = Platform.OS === 'web';

    if (!hasError) return children;

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, isWeb && styles.webContent]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Errore</Text>
            <Text style={styles.message}>Qualcosa e andato storto.</Text>
            <TouchableOpacity style={styles.button} onPress={this.handleBack}>
              <Text style={styles.buttonText}>Indietro</Text>
            </TouchableOpacity>
            {__DEV__ && error ? (
              <View style={styles.debug}>
                <Text style={styles.debugTitle}>Dettagli</Text>
                <Text style={styles.debugText}>{String(error.message || error)}</Text>
                {errorInfo?.componentStack ? (
                  <Text style={styles.debugStack}>{errorInfo.componentStack}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    flexGrow: 1,
  },
  webContent: {
    paddingLeft: theme.spacing.lg + WEB_TAB_BAR_WIDTH,
    paddingRight: theme.spacing.lg,
    minHeight: '100%',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    ...theme.shadow.card,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  message: {
    color: theme.colors.muted,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondary,
  },
  buttonText: {
    color: theme.colors.card,
    fontWeight: '700',
  },
  debug: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  debugTitle: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  debugText: {
    color: theme.colors.muted,
  },
  debugStack: {
    color: theme.colors.muted,
  },
});

export default ErrorBoundary;
