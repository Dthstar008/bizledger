import { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
}

export function Chip({ label, selected, onPress, icon, disabled }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? colors.primary : colors.textMuted} /> : null}
      <AppText variant="label" style={{ color: selected ? colors.primary : colors.text }} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

interface GroupProps<T extends string> {
  options: { value: T; label: string; icon?: ChipProps['icon'] }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  /** Single horizontal scrolling row (filters) instead of wrapping onto new lines (forms). */
  scrollable?: boolean;
}

/** One-of-many selector used for filters, periods, payment methods and categories. */
export function ChipGroup<T extends string>({ options, value, onChange, scrollable }: GroupProps<T>) {
  const chips = options.map((o) => (
    <Chip key={o.value} label={o.label} icon={o.icon} selected={o.value === value} onPress={() => onChange(o.value)} />
  ));
  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={[styles.row, styles.wrap]}>{chips}</View>;
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexWrap: 'wrap' },
});
