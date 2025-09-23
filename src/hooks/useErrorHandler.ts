import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

/**
 * Enhanced error handling hook with retry logic
 */
export const useErrorHandler = () => {
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((error: any, context?: string) => {
    const apiError: ApiError = {
      message: error.message || 'An unexpected error occurred',
      code: error.code,
      statusCode: error.statusCode,
      details: error.details || error,
    };

    console.error(`Error in ${context || 'unknown context'}:`, apiError);
    setErrors(prev => [...prev, apiError]);

    // Show user-friendly error message
    Alert.alert(
      'Erro',
      getErrorMessage(apiError),
      [{ text: 'OK', onPress: () => clearError(apiError) }]
    );

    return apiError;
  }, []);

  const clearError = useCallback((error: ApiError) => {
    setErrors(prev => prev.filter(e => e !== error));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    const { maxRetries = 3, retryDelay = 1000, exponentialBackoff = true } = options;
    
    setIsRetrying(true);
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        setIsRetrying(false);
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          setIsRetrying(false);
          throw error;
        }

        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt)
          : retryDelay;
          
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    setIsRetrying(false);
    throw new Error('Max retries exceeded');
  }, []);

  return {
    errors,
    isRetrying,
    handleError,
    clearError,
    clearAllErrors,
    retry,
  };
};

/**
 * Get user-friendly error messages
 */
const getErrorMessage = (error: ApiError): string => {
  // Database/Network errors
  if (error.code === 'PGRST116') {
    return 'Item não encontrado';
  }
  
  if (error.code === '23505') {
    return 'Este item já existe';
  }
  
  if (error.statusCode === 401) {
    return 'Sessão expirada. Por favor, faça login novamente';
  }
  
  if (error.statusCode === 403) {
    return 'Não tem permissão para realizar esta ação';
  }
  
  if (error.statusCode === 429) {
    return 'Muitas tentativas. Tente novamente em alguns minutos';
  }
  
  if (error.statusCode && error.statusCode >= 500) {
    return 'Erro do servidor. Tente novamente mais tarde';
  }
  
  // Network errors
  if (error.message.includes('network') || error.message.includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet';
  }
  
  return error.message;
};

/**
 * Hook for handling async operations with loading and error states
 */
export const useAsyncOperation = <T, P extends any[] = []>(
  operation: (...args: P) => Promise<T>
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const { handleError, retry } = useErrorHandler();

  const execute = useCallback(async (...args: P): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await operation(...args);
      setData(result);
      return result;
    } catch (err) {
      const apiError = handleError(err, 'async operation');
      setError(apiError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [operation, handleError]);

  const executeWithRetry = useCallback(async (
    options: RetryOptions = {},
    ...args: P
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await retry(() => operation(...args), options);
      setData(result);
      return result;
    } catch (err) {
      const apiError = handleError(err, 'async operation with retry');
      setError(apiError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [operation, handleError, retry]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    data,
    error,
    execute,
    executeWithRetry,
    reset,
  };
};