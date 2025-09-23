import React from 'react';
import { render } from '@testing-library/react-native';
import { useErrorHandler } from '../../src/hooks/useErrorHandler';
import { renderHook, act } from '@testing-library/react-hooks';

describe('useErrorHandler', () => {
  it('should handle errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      const error = new Error('Test error');
      result.current.handleError(error, 'test context');
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('Test error');
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      const error = new Error('Test error');
      result.current.handleError(error, 'test context');
    });

    act(() => {
      result.current.clearAllErrors();
    });

    expect(result.current.errors).toHaveLength(0);
  });

  it('should retry operations', async () => {
    const { result } = renderHook(() => useErrorHandler());
    let attempts = 0;
    
    const operation = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Retry me');
      }
      return 'success';
    });

    let res;
    await act(async () => {
      res = await result.current.retry(operation, { maxRetries: 3, retryDelay: 10 });
    });

    expect(res).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});