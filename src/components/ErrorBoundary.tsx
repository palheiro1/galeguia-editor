import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../styles/designSystem';
import { SecurityLogger } from '../lib/security';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error | undefined;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log security event for monitoring
    SecurityLogger.logSecurityEvent({
      type: 'suspicious_activity',
      details: {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      severity: 'high',
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    
    // For web, try to reload the page to reset the session state
    if (Platform.OS === 'web') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            There was an error loading the application. This might be a session issue.
          </Text>
          {this.state.error && (
            <Text style={styles.errorDetails}>
              {this.state.error.message}
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.gray50,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.gray900,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.base,
  },
  errorDetails: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
