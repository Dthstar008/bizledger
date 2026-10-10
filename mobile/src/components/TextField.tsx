import { ComponentProps, forwardRef, useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { control, radius, spacing, type } from '../theme';
import { makeStyles, useTheme } from '../theming';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  helper?: string;
  /** Adds an eye button that reveals/hides the value (passwords). */
  secureToggle?: boolean;
  leftIcon?: ComponentProps<typeof Ionicons>['name'];
  /** Shown before the input, e.g. "₦". */
  prefix?: string;
}

/**
 * Label above a 56dp field (readable at a glance, never hidden behind the
 * typed value), with helper or error text below. Errors are always written
 * out, never shown only as a red border.
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, helper, secureToggle, leftIcon, prefix, editable = true, style, onFocus, onBlur, secureTextEntry, ...inputProps },
  ref,
) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.container}>
      <AppText variant="label" tone={error ? 'danger' : 'muted'}>
        {label}
      </AppText>
      <View style={[styles.field, focused && styles.focused, !!error && styles.errored, !editable && styles.disabled]}>
        {leftIcon ? <Ionicons name={leftIcon} size={20} color={focused ? colors.primary : colors.textMuted} /> : null}
        {prefix ? <AppText variant="bodyStrong" tone="muted">{prefix}</AppText> : null}
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={colors.textSubtle}
          editable={editable}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={10}
            style={styles.eye}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.message}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite" style={styles.flex}>
            {error}
          </AppText>
        </View>
      ) : helper ? (
        <AppText variant="caption" tone="muted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

const useStyles = makeStyles((c) => ({
  container: { gap: spacing.xs + 2, minWidth: 0 },
  field: {
    minHeight: control.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md - 2,
  },
  focused: { borderColor: c.primary },
  errored: { borderColor: c.danger },
  disabled: { backgroundColor: c.surfaceAlt },
  input: {
    ...type.body,
    flex: 1,
    // Lets the input shrink in narrow rows; on web an <input> otherwise keeps its intrinsic width.
    minWidth: 0,
    color: c.text,
    paddingVertical: spacing.sm + 2,
  },
  eye: { padding: spacing.xs },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  flex: { flex: 1 },
}));
