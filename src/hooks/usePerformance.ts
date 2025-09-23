// Performance optimization utilities
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { Audio } from 'expo-av';

/**
 * Custom hook for debouncing values
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook for throttling function calls
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastExecRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastExecRef.current >= delay) {
        lastExecRef.current = now;
        return func(...args);
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastExecRef.current = Date.now();
        func(...args);
      }, delay - (now - lastExecRef.current));
    }) as T,
    [func, delay]
  );
};

/**
 * Hook for running tasks after interactions
 */
export const useInteractionManager = (task: () => void, deps: any[] = []) => {
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      task();
    });

    return () => handle.cancel();
  }, deps);
};

/**
 * Custom hook for managing audio resources
 */
export const useAudioManager = () => {
  const audioRef = useRef<Audio.Sound | null>(null);

  const playAudio = useCallback(async (uri: string) => {
    try {
      // Clean up previous audio
      if (audioRef.current) {
        await audioRef.current.unloadAsync();
        audioRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync({ uri });
      audioRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }, []);

  const stopAudio = useCallback(async () => {
    if (audioRef.current) {
      await audioRef.current.stopAsync();
    }
  }, []);

  const cleanup = useCallback(async () => {
    if (audioRef.current) {
      await audioRef.current.unloadAsync();
      audioRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { playAudio, stopAudio, cleanup };
};

/**
 * Memory-efficient image caching
 */
export const useImageCache = () => {
  const cache = useRef<Map<string, string>>(new Map());

  const getCachedImage = useCallback((uri: string) => {
    return cache.current.get(uri);
  }, []);

  const setCachedImage = useCallback((uri: string, cachedUri: string) => {
    // Implement LRU cache with size limit
    if (cache.current.size > 100) {
      const firstKey = cache.current.keys().next().value;
      if (firstKey) {
        cache.current.delete(firstKey);
      }
    }
    cache.current.set(uri, cachedUri);
  }, []);

  return { getCachedImage, setCachedImage };
};