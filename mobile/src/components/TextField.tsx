import { ComponentProps, forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radius, spacing, touch } from '../theme';

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

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, helper, secureToggle, leftIcon, prefix, editable = true, style, onFocus, onBlur, secureTextEntry, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.container}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <View
        style={[
          styles.field,
          focused && styles.focused,
          !!error && styles.errored,
          !editable && styles.disabled,
        ]}
      >
        {leftIcon ? <Ionicons name={leftIcon} size={18} color={colors.textMuted} /> : null}
        {prefix ? <AppText tone="muted">{prefix}</AppText> : null}
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={colors.textSubtle}
          editable={editable}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          accessibilityLabel={label}
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
            hitSlop={8}
            style={styles.eye}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="subtle">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs + 2, minWidth: 0 },
  field: {
    minHeight: touch.min + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md - 2,
  },
  focused: { borderColor: colors.primary, borderWidth: 1.5 },
  errored: { borderColor: colors.danger },
  disabled: { backgroundColor: colors.surfaceAlt },
  input: {
    flex: 1,
    // Lets the input shrink in narrow rows; on web an <input> otherwise keeps its intrinsic width.
    minWidth: 0,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.sm + 2,
  },
  eye: { padding: spacing.xs },
});
