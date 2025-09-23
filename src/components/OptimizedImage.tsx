import React, { useState, memo, useCallback } from 'react';
import { Image, View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../styles/designSystem';
import { useImageCache } from '../hooks/usePerformance';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  placeholder?: React.ReactNode;
  errorComponent?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: any) => void;
  testID?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  source,
  style,
  resizeMode = 'cover',
  placeholder,
  errorComponent,
  onLoad,
  onError,
  testID,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { getCachedImage, setCachedImage } = useImageCache();

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback((errorEvent: any) => {
    setLoading(false);
    setError(true);
    console.warn('Image load error:', errorEvent);
    onError?.(errorEvent);
  }, [onError]);

  const handleRetry = useCallback(() => {
    if (retryCount < 2) { // Max 2 retries
      setRetryCount(prev => prev + 1);
      setLoading(true);
      setError(false);
    }
  }, [retryCount]);

  // Check cache for web images
  const imageUri = typeof source === 'object' ? source.uri : undefined;
  const cachedUri = imageUri ? getCachedImage(imageUri) : undefined;
  const finalSource = cachedUri ? { uri: cachedUri } : source;

  const handleLoadEnd = useCallback(() => {
    if (imageUri && !cachedUri) {
      setCachedImage(imageUri, imageUri); // Simple cache implementation
    }
  }, [imageUri, cachedUri, setCachedImage]);

  if (error) {
    return (
      <View style={[styles.container, style]} testID={`${testID}-error`}>
        {errorComponent || (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️</Text>
            <Text style={styles.errorMessage}>Falha ao carregar</Text>
            {retryCount < 2 && (
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Image
        source={finalSource}
        style={[StyleSheet.absoluteFillObject, { opacity: loading ? 0 : 1 }]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        onLoadEnd={handleLoadEnd}
        testID={`${testID}-image`}
      />
      
      {loading && (
        <View style={styles.loadingContainer} testID={`${testID}-loading`}>
          {placeholder || (
            <>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Carregando...</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.base,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  loadingText: {
    marginTop: SPACING.xs,
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  errorText: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  errorMessage: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  retryButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
});