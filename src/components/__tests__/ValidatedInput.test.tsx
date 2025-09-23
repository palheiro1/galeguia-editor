import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ValidatedInput, ValidationRules, ValidatedInputRef } from '../ValidatedInput';

describe('ValidatedInput', () => {
  const mockOnChangeText = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with basic props', () => {
    const { getByTestId } = render(
      <ValidatedInput 
        testID="test-input"
        placeholder="Enter text"
      />
    );

    expect(getByTestId('test-input')).toBeTruthy();
    expect(getByTestId('test-input-input')).toBeTruthy();
  });

  it('shows label when provided', () => {
    const { getByText } = render(
      <ValidatedInput 
        label="Test Label"
        testID="test-input"
      />
    );

    expect(getByText('Test Label')).toBeTruthy();
  });

  it('shows required asterisk when required', () => {
    const { getByText } = render(
      <ValidatedInput 
        label="Test Label"
        required
        testID="test-input"
      />
    );

    expect(getByText('*')).toBeTruthy();
  });

  it('validates required field correctly', async () => {
    const { getByTestId, queryByTestId } = render(
      <ValidatedInput 
        required
        testID="test-input"
        onChangeText={mockOnChangeText}
      />
    );

    const input = getByTestId('test-input-input');
    
    // Focus and blur without entering text
    fireEvent(input, 'focus');
    fireEvent(input, 'blur');

    await waitFor(() => {
      expect(queryByTestId('test-input-error')).toBeTruthy();
    });
  });

  it('validates email format correctly', async () => {
    const { getByTestId, queryByTestId } = render(
      <ValidatedInput 
        validationRules={[ValidationRules.email]}
        testID="test-input"
        onChangeText={mockOnChangeText}
      />
    );

    const input = getByTestId('test-input-input');
    
    // Enter invalid email
    fireEvent.changeText(input, 'invalid-email');
    fireEvent(input, 'blur');

    await waitFor(() => {
      expect(queryByTestId('test-input-error')).toBeTruthy();
    });

    // Enter valid email
    fireEvent.changeText(input, 'test@example.com');
    fireEvent(input, 'blur');

    await waitFor(() => {
      expect(queryByTestId('test-input-error')).toBeFalsy();
    });
  });

  it('calls onChangeText with validation status', async () => {
    const { getByTestId } = render(
      <ValidatedInput 
        validationRules={[ValidationRules.minLength(5)]}
        testID="test-input"
        onChangeText={mockOnChangeText}
        debounceMs={0} // Disable debounce for testing
      />
    );

    const input = getByTestId('test-input-input');
    
    fireEvent.changeText(input, 'abc'); // Invalid
    
    await waitFor(() => {
      expect(mockOnChangeText).toHaveBeenCalledWith('abc', false);
    });

    fireEvent.changeText(input, 'abcdef'); // Valid
    
    await waitFor(() => {
      expect(mockOnChangeText).toHaveBeenCalledWith('abcdef', true);
    });
  });

  it('exposes ref methods correctly', () => {
    const ref = React.createRef<ValidatedInputRef>();
    
    render(
      <ValidatedInput 
        ref={ref}
        testID="test-input"
      />
    );

    expect(ref.current?.focus).toBeDefined();
    expect(ref.current?.blur).toBeDefined();
    expect(ref.current?.validate).toBeDefined();
    expect(ref.current?.getValue).toBeDefined();
    expect(ref.current?.setValue).toBeDefined();
    expect(ref.current?.clear).toBeDefined();
  });

  it('ref methods work correctly', () => {
    const ref = React.createRef<ValidatedInputRef>();
    
    render(
      <ValidatedInput 
        ref={ref}
        required
        testID="test-input"
      />
    );

    // Test setValue and getValue
    ref.current?.setValue('test value');
    expect(ref.current?.getValue()).toBe('test value');

    // Test validate
    expect(ref.current?.validate()).toBe(true);

    // Test clear
    ref.current?.clear();
    expect(ref.current?.getValue()).toBe('');
    expect(ref.current?.validate()).toBe(false); // Should fail required validation
  });

  it('shows helper text when provided', () => {
    const { getByTestId } = render(
      <ValidatedInput 
        helperText="This is helper text"
        testID="test-input"
      />
    );

    expect(getByTestId('test-input-helper')).toBeTruthy();
  });

  it('prevents XSS attacks', async () => {
    const { getByTestId, queryByTestId } = render(
      <ValidatedInput 
        testID="test-input"
        onChangeText={mockOnChangeText}
      />
    );

    const input = getByTestId('test-input-input');
    
    fireEvent.changeText(input, '<script>alert("xss")</script>');
    fireEvent(input, 'blur');

    await waitFor(() => {
      expect(queryByTestId('test-input-error')).toBeTruthy();
    });
  });
});