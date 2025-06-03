import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  COMMON_STYLES,
  BUTTON_VARIANTS,
  ICON_SIZES,
} from '../styles/designSystem';

// Button Component
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const sizeStyles = {
    sm: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
    md: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg },
    lg: { paddingVertical: SPACING.base, paddingHorizontal: SPACING.xl },
  };

  const textSizes = {
    sm: TYPOGRAPHY.fontSize.sm,
    md: TYPOGRAPHY.fontSize.base,
    lg: TYPOGRAPHY.fontSize.lg,
  };

  const iconSizes = {
    sm: ICON_SIZES.sm,
    md: ICON_SIZES.base,
    lg: ICON_SIZES.lg,
  };

  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const buttonVariant = BUTTON_VARIANTS[variant];

  return (
    <TouchableOpacity
      style={[
        COMMON_STYLES.button,
        sizeStyles[size],
        buttonVariant,
        isOutline && { borderWidth: 1 },
        disabled && { opacity: 0.6 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          color={isOutline || isGhost ? COLORS.primary : COLORS.white} 
          size="small" 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <MaterialIcons
              name={icon}
              size={iconSizes[size]}
              color={isOutline || isGhost ? COLORS.primary : COLORS.white}
            />
          )}
          <Text
            style={[
              {
                color: isOutline || isGhost ? COLORS.primary : COLORS.white,
                fontSize: textSizes[size],
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <MaterialIcons
              name={icon}
              size={iconSizes[size]}
              color={isOutline || isGhost ? COLORS.primary : COLORS.white}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

// Card Component
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const Component = onPress ? TouchableOpacity : View;
  
  return (
    <Component
      style={[COMMON_STYLES.card, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.95 : 1}
    >
      {children}
    </Component>
  );
};

// Input Component
interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  error?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  secureTextEntry = false,
  error,
  icon,
  style,
  inputStyle,
}) => {
  return (
    <View style={[{ marginBottom: SPACING.base }, style]}>
      {label && (
        <Text style={styles.inputLabel}>{label}</Text>
      )}
      <View style={styles.inputContainer}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={ICON_SIZES.base}
            color={COLORS.textSecondary}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[
            COMMON_STYLES.input,
            multiline && { height: numberOfLines * 24 + SPACING.lg, textAlignVertical: 'top' },
            icon && { paddingLeft: SPACING.xl + ICON_SIZES.base },
            error && { borderColor: COLORS.error },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
        />
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

// Badge Component
interface BadgeProps {
  text: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon?: keyof typeof MaterialIcons.glyphMap;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ text, variant = 'neutral', icon, style }) => {
  const variantStyles = {
    success: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0', color: COLORS.success },
    warning: { backgroundColor: '#fef3c7', borderColor: '#fde68a', color: COLORS.warning },
    error: { backgroundColor: '#fee2e2', borderColor: '#fecaca', color: COLORS.error },
    info: { backgroundColor: '#dbeafe', borderColor: '#bfdbfe', color: COLORS.primary },
    neutral: { backgroundColor: COLORS.gray100, borderColor: COLORS.gray200, color: COLORS.gray600 },
  };

  const variantStyle = variantStyles[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
        },
        style,
      ]}
    >
      {icon && (
        <MaterialIcons
          name={icon}
          size={ICON_SIZES.xs}
          color={variantStyle.color}
        />
      )}
      <Text
        style={[
          styles.badgeText,
          { color: variantStyle.color },
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

// Progress Bar Component
interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = COLORS.primary,
  backgroundColor = COLORS.gray200,
  height = 6,
  style,
}) => {
  return (
    <View
      style={[
        {
          height,
          backgroundColor,
          borderRadius: height / 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, progress))}%`,
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
};

// Icon Button Component
interface IconButtonProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  size?: keyof typeof ICON_SIZES;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'base',
  color = COLORS.white,
  backgroundColor = COLORS.primary,
  style,
  disabled = false,
}) => {
  const iconSize = ICON_SIZES[size];
  const buttonSize = iconSize + SPACING.md;

  return (
    <TouchableOpacity
      style={[
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
          ...SHADOWS.sm,
        },
        disabled && { opacity: 0.6 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <MaterialIcons name={icon} size={iconSize} color={color} />
    </TouchableOpacity>
  );
};

// Loading Component
interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  style?: ViewStyle;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  color = COLORS.primary,
  text,
  style,
}) => {
  return (
    <View style={[styles.loadingContainer, style]}>
      <ActivityIndicator size={size} color={color} />
      {text && (
        <Text style={styles.loadingText}>{text}</Text>
      )}
    </View>
  );
};

// Empty State Component
interface EmptyStateProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description?: string;
  action?: {
    title: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  style,
}) => {
  return (
    <View style={[styles.emptyState, style]}>
      {icon && (
        <MaterialIcons
          name={icon}
          size={ICON_SIZES['3xl']}
          color={COLORS.textTertiary}
          style={styles.emptyIcon}
        />
      )}
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && (
        <Text style={styles.emptyDescription}>{description}</Text>
      )}
      {action && (
        <Button
          title={action.title}
          onPress={action.onPress}
          variant="outline"
          style={styles.emptyAction}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: SPACING.md,
    top: SPACING.md,
    zIndex: 1,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptyDescription: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.base,
    marginBottom: SPACING.lg,
  },
  emptyAction: {
    marginTop: SPACING.md,
  },
});
