import { ComponentProps } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { radius, spacing, touch } from '../theme';
import { makeStyles, useTheme } from '../theming';
import { selectionHaptic } from '../utils/haptics';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
}

export function Chip({ label, selected, onPress, icon, disabled }: ChipProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              selectionHaptic();
              onPress();
            }
          : undefined
      }
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {selected ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : icon ? <Ionicons name={icon} size={16} color={colors.textMuted} /> : null}
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
  const styles = useStyles();
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

const useStyles = makeStyles((c) => ({
  chip: {
    minHeight: touch.min - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  selected: { backgroundColor: c.primaryMuted, borderColor: c.primarySoft },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexWrap: 'wrap' },
}));
