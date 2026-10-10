import { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, touch } from '../theme';
import { makeStyles, useTheme } from '../theming';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** Required: icon-only controls need a spoken name. */
  accessibilityLabel: string;
  tone?: 'default' | 'primary' | 'danger' | 'muted' | 'gold';
  variant?: 'plain' | 'filled';
  size?: number;
  disabled?: boolean;
}

const toneKey: Record<NonNullable<Props['tone']>, keyof Colors> = {
  default: 'text',
  primary: 'primary',
  danger: 'danger',
  muted: 'textMuted',
  gold: 'goldDeep',
};

/** Icon-only control with a full 48dp target. */
export function IconButton({ icon, onPress, accessibilityLabel, tone = 'default', variant = 'plain', size = 22, disabled }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      style={({ pressed }) => [styles.base, variant === 'filled' && styles.filled, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={size} color={colors[toneKey[tone]]} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  base: {
    width: touch.min,
    height: touch.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  pressed: { backgroundColor: c.primaryMuted },
  disabled: { opacity: 0.4 },
}));
