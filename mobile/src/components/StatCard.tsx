import { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useLayout } from '../hooks/useLayout';
import { radius, spacing } from '../theme';
import { makeStyles, useTheme } from '../theming';

interface Props {
  label: string;
  value: string;
  /** positive: money in (green). owed: money owed to you (gold). negative: money out / overdue (red). */
  tone?: 'default' | 'positive' | 'owed' | 'negative';
  icon?: ComponentProps<typeof Ionicons>['name'];
  hint?: string;
  /** Change vs the previous period, e.g. +12 or -4 (percent). Shown with an arrow, never colour alone. */
  delta?: number | null;
  onPress?: () => void;
}

export function StatCard({ label, value, tone = 'default', icon, hint, delta, onPress }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = tone === 'positive' ? colors.primary : tone === 'owed' ? colors.goldDeep : tone === 'negative' ? colors.danger : colors.text;
  const iconBg = tone === 'owed' ? colors.goldMuted : tone === 'negative' ? colors.dangerMuted : colors.primaryMuted;
  const iconFg = tone === 'owed' ? colors.goldDeep : tone === 'negative' ? colors.danger : colors.primary;
  const Wrapper = onPress ? Pressable : View;
  const deltaText = delta == null || !Number.isFinite(delta) ? null : `${delta >= 0 ? '+' : '−'}${Math.abs(Math.round(delta))}%`;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}${deltaText ? `, ${delta! >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(delta!))} percent` : ''}`}
      style={styles.card}
    >
      <View style={styles.head}>
        {icon ? (
          <View style={[styles.icon, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={16} color={iconFg} />
          </View>
        ) : null}
        <AppText variant="caption" tone="muted" numberOfLines={2} style={styles.flex}>
          {label}
        </AppText>
      </View>
      <AppText variant="metric" style={{ color }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </AppText>
      {deltaText || hint ? (
        <View style={styles.foot}>
          {deltaText ? (
            <View style={[styles.delta, { backgroundColor: delta! >= 0 ? colors.primaryMuted : colors.dangerMuted }]}>
              <Ionicons name={delta! >= 0 ? 'arrow-up' : 'arrow-down'} size={11} color={delta! >= 0 ? colors.primary : colors.danger} />
              <AppText variant="caption" style={{ color: delta! >= 0 ? colors.primary : colors.danger }}>
                {deltaText}
              </AppText>
            </View>
          ) : null}
          {hint ? (
            <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.flex}>
              {hint}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Wrapper>
  );
}

/** Lays out StatCards in 2 columns on phones, 3–4 on tablets, with equal widths. */
export function StatGrid({ children }: PropsWithChildren) {
  const styles = useStyles();
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

const useStyles = makeStyles((c, t) => ({
  card: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md - 2,
    gap: spacing.sm,
    ...t.shadow.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  cell: { padding: spacing.xs },
}));
