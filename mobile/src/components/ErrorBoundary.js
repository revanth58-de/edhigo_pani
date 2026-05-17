import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { captureError } from '../config/sentry';

/**
 * ErrorBoundary — catches unhandled React render errors and shows a
 * friendly recovery screen instead of a blank crash.
 *
 * Usage:
 *   Wrap your root navigator with <ErrorBoundary> in App.js so that
 *   any uncaught error anywhere in the tree is caught here.
 */
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
    // Report to Sentry in production; falls back to console.error in dev
    captureError(error, { componentStack: errorInfo?.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <MaterialIcons name="error-outline" size={72} color="#ef4444" />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          The app ran into an unexpected error. Your data is safe.
        </Text>

        {/* Show technical details only in development */}
        {__DEV__ && this.state.error && (
          <ScrollView style={styles.detailsBox} contentContainerStyle={{ padding: 12 }}>
            <Text style={styles.errorText}>{this.state.error.toString()}</Text>
            {this.state.errorInfo?.componentStack ? (
              <Text style={styles.stackText}>{this.state.errorInfo.componentStack}</Text>
            ) : null}
          </ScrollView>
        )}

        <TouchableOpacity style={styles.retryBtn} onPress={this.handleReset} activeOpacity={0.85}>
          <MaterialIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  detailsBox: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginBottom: 24,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  stackText: {
    color: '#9ca3af',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;
