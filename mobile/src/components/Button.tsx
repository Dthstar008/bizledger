import { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radius, spacing, touch } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
/** danger = filled red for the final confirm; destructive = red outline for a delete entry point. */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive';
type Size = 'md' | 'sm';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the container width (forms, sticky footers). Otherwise the button hugs its label. */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

const fg: Record<Variant, string> = {
  primary: colors.onPrimary,
  secondary: colors.text,
  ghost: colors.primary,
  danger: colors.onPrimary,
  destructive: colors.danger,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  fullWidth,
  accessibilityLabel,
  style,
}: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        styles[variant],
        fullWidth ? styles.full : styles.hug,
        pressed && !inactive && (variant === 'primary' ? styles.primaryPressed : styles.pressed),
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} size="small" />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg[variant]} /> : null}
          <AppText variant={size === 'sm' ? 'label' : 'bodyStrong'} style={{ color: fg[variant] }} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  md: { minHeight: touch.min + 4, paddingHorizontal: spacing.lg - 4 },
  sm: { minHeight: 36, paddingHorizontal: spacing.md - 2, borderRadius: radius.sm },
  full: { alignSelf: 'stretch' },
  hug: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
  destructive: { backgroundColor: colors.surface, borderColor: colors.danger },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
});
