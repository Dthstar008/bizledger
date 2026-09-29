import { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useLayout } from '../hooks/useLayout';
import { colors, radius, shadow, spacing } from '../theme';

interface Props {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative';
  icon?: ComponentProps<typeof Ionicons>['name'];
  hint?: string;
  onPress?: () => void;
}

export function StatCard({ label, value, tone = 'default', icon, hint, onPress }: Props) {
  const color = tone === 'positive' ? colors.primary : tone === 'negative' ? colors.danger : colors.text;
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      style={styles.card}
    >
      <View style={styles.head}>
        {icon ? <Ionicons name={icon} size={16} color={colors.textMuted} /> : null}
        <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.flex}>
          {label}
        </AppText>
      </View>
      <AppText variant="metric" style={{ color }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" tone="subtle" numberOfLines={1}>
          {hint}
        </AppText>
      ) : null}
    </Wrapper>
  );
}

/** Lays out StatCards in 2 columns on phones, 3–4 on tablets, with equal widths. */
export function StatGrid({ children }: PropsWithChildren) {
  const { gridColumns } = useLayout();
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  const basis = `${100 / gridColumns}%` as const;
  return (
    <View style={styles.grid}>
      {items.map((child, i) => (
        <View key={i} style={[styles.cell, { flexBasis: basis, maxWidth: basis }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md - 2,
    gap: spacing.xs,
    ...shadow.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs - 1 },
  cell: { padding: spacing.xs + 1 },
});
