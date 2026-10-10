import { ComponentProps, useState } from 'react';
import { ActivityIndicator, Pressable, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Colors, control, radius, spacing } from '../theme';
import { makeStyles, useTheme } from '../theming';

type IconName = ComponentProps<typeof Ionicons>['name'];
/**
 * primary: green fill. gold: the single most important positive action on a
 * screen ("Record sale"). secondary: green outline. ghost: text only.
 * destructive: red outline (delete entry point); danger: red fill (final confirm).
 */
type Variant = 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger' | 'destructive';
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

const fgKey: Record<Variant, keyof Colors> = {
  primary: 'onPrimary',
  gold: 'onGold',
  secondary: 'primary',
  ghost: 'primary',
  danger: 'onPrimary',
  destructive: 'danger',
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
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  const inactive = disabled || loading;
  // On the dark-mode red, deep text reads better than white.
  const fg = variant === 'danger' && scheme === 'light' ? '#FFFFFF' : colors[fgKey[variant]];
  const pressedStyle = {
    primary: styles.primaryPressed,
    gold: styles.goldPressed,
    secondary: styles.tintPressed,
    ghost: styles.tintPressed,
    danger: styles.dimPressed,
    destructive: styles.dangerTintPressed,
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        styles[variant],
        fullWidth ? styles.full : styles.hug,
        pressed && !inactive && pressedStyle,
        focused && styles.focused,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 18 : 20} color={fg} /> : null}
          <AppText variant={size === 'sm' ? 'label' : 'bodyStrong'} style={[{ color: fg }, styles.label]} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    maxWidth: '100%',
  },
  md: { minHeight: control.button, paddingHorizontal: spacing.lg },
  sm: { minHeight: control.buttonSm, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  full: { alignSelf: 'stretch' },
  hug: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: '100%' },
  label: { flexShrink: 1 },
  primary: { backgroundColor: c.primary },
  primaryPressed: { backgroundColor: c.primaryPressed },
  gold: { backgroundColor: c.gold },
  goldPressed: { backgroundColor: '#E0A800' },
  secondary: { backgroundColor: c.surface, borderColor: c.primary },
  ghost: { backgroundColor: 'transparent' },
  tintPressed: { backgroundColor: c.primaryMuted },
  danger: { backgroundColor: c.danger },
  dimPressed: { opacity: 0.85 },
  destructive: { backgroundColor: c.surface, borderColor: c.danger },
  dangerTintPressed: { backgroundColor: c.dangerMuted },
  // 2px gold ring, for keyboard and switch access.
  focused: { borderColor: c.focus, borderWidth: 2 },
  disabled: { opacity: 0.45 },
}));
