import { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, touch } from '../theme';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** Required: icon-only controls need a spoken name. */
  accessibilityLabel: string;
  tone?: 'default' | 'primary' | 'danger' | 'muted';
  variant?: 'plain' | 'filled';
  size?: number;
  disabled?: boolean;
}

const toneColor = {
  default: colors.text,
  primary: colors.primary,
  danger: colors.danger,
  muted: colors.textMuted,
};

export function IconButton({ icon, onPress, accessibilityLabel, tone = 'default', variant = 'plain', size = 22, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        variant === 'filled' && styles.filled,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={size} color={toneColor[tone]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touch.min,
    height: touch.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pressed: { backgroundColor: colors.surfaceAlt },
  disabled: { opacity: 0.4 },
});
