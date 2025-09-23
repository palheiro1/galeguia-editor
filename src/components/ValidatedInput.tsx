import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  Animated,
  TextInputProps,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../styles/designSystem';

interface ValidationRule {
  rule: (value: string) => boolean;
  message: string;
}

interface ValidatedInputProps extends Omit<TextInputProps, 'onChangeText'> {
  label?: string;
  error?: string;
  validationRules?: ValidationRule[];
  onChangeText?: (text: string, isValid: boolean) => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
  required?: boolean;
  debounceMs?: number;
  testID?: string;
}

export interface ValidatedInputRef {
  focus: () => void;
  blur: () => void;
  validate: () => boolean;
  getValue: () => string;
  setValue: (value: string) => void;
  clear: () => void;
}

export const ValidatedInput = forwardRef<ValidatedInputRef, ValidatedInputProps>(({
  label,
  error,
  validationRules = [],
  onChangeText,
  leftIcon,
  rightIcon,
  helperText,
  required = false,
  debounceMs = 300,
  testID,
  style,
  ...props
}, ref) => {
  const [value, setValue] = useState(props.value || '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const inputRef = React.useRef<TextInput>(null);
  const focusAnimation = React.useRef(new Animated.Value(0)).current;

  const validateValue = useCallback((inputValue: string): string | null => {
    // Required validation
    if (required && (!inputValue || inputValue.trim().length === 0)) {
      return 'Este campo é obrigatório';
    }

    // Basic XSS protection
    if (inputValue && /[<>\"'&]/.test(inputValue)) {
      return 'Texto contém caracteres não permitidos';
    }

    // Custom validation rules
    for (const rule of validationRules) {
      if (!rule.rule(inputValue)) {
        return rule.message;
      }
    }

    return null;
  }, [required, validationRules]);

  const handleChangeText = useCallback((text: string) => {
    setValue(text);
    
    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Debounced validation and callback
    const timeout = setTimeout(() => {
      const validationError = validateValue(text);
      setLocalError(validationError);
      
      const isValid = !validationError;
      onChangeText?.(text, isValid);
    }, debounceMs);

    setDebounceTimeout(timeout);
  }, [debounceTimeout, debounceMs, onChangeText, validateValue]);

  const handleFocus = useCallback(() => {
    Animated.timing(focusAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focusAnimation]);

  const handleBlur = useCallback(() => {
    setHasBeenTouched(true);
    
    // Validate on blur
    const validationError = validateValue(value);
    setLocalError(validationError);
    
    Animated.timing(focusAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focusAnimation, validateValue, value]);

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    validate: () => {
      const validationError = validateValue(value);
      setLocalError(validationError);
      setHasBeenTouched(true);
      return !validationError;
    },
    getValue: () => value,
    setValue: (newValue: string) => {
      setValue(newValue);
      const validationError = validateValue(newValue);
      setLocalError(validationError);
    },
    clear: () => {
      setValue('');
      setLocalError(null);
      setHasBeenTouched(false);
    },
  }), [validateValue, value]);

  const currentError = error || localError;
  const showError = hasBeenTouched && currentError;
  const borderColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [
      showError ? COLORS.error : COLORS.gray300,
      showError ? COLORS.error : COLORS.primary
    ],
  });

  return (
    <View style={[styles.container, style]} testID={testID}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.requiredStar}> *</Text>}
        </Text>
      )}
      
      <Animated.View style={[styles.inputContainer, { borderColor }]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={COLORS.text.secondary}
          testID={`${testID}-input`}
          {...props}
        />
        
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </Animated.View>
      
      {(showError || helperText) && (
        <View style={styles.helperContainer}>
          {showError ? (
            <Text style={styles.errorText} testID={`${testID}-error`}>
              {currentError}
            </Text>
          ) : helperText ? (
            <Text style={styles.helperText} testID={`${testID}-helper`}>
              {helperText}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
});

ValidatedInput.displayName = 'ValidatedInput';

// Pre-built validation rules
export const ValidationRules = {
  email: {
    rule: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Email inválido',
  },
  minLength: (length: number) => ({
    rule: (value: string) => value.length >= length,
    message: `Mínimo ${length} caracteres`,
  }),
  maxLength: (length: number) => ({
    rule: (value: string) => value.length <= length,
    message: `Máximo ${length} caracteres`,
  }),
  numeric: {
    rule: (value: string) => /^\d+$/.test(value),
    message: 'Apenas números',
  },
  alphanumeric: {
    rule: (value: string) => /^[a-zA-Z0-9\s]*$/.test(value),
    message: 'Apenas letras, números e espaços',
  },
  noSpecialChars: {
    rule: (value: string) => !/[<>\"'&]/.test(value),
    message: 'Caracteres especiais não permitidos',
  },
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  requiredStar: {
    color: COLORS.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.base,
    backgroundColor: COLORS.white,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
  },
  inputWithLeftIcon: {
    paddingLeft: SPACING.xs,
  },
  inputWithRightIcon: {
    paddingRight: SPACING.xs,
  },
  leftIcon: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
  },
  rightIcon: {
    paddingRight: SPACING.md,
    paddingLeft: SPACING.xs,
  },
  helperContainer: {
    marginTop: SPACING.xs,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
});