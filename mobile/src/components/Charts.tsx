import { useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme';

export interface TrendPoint {
  label: string;
  value: number;
  /** Optional second series drawn as a line (e.g. expenses). */
  secondary?: number;
}

// SVG text defaults to a serif font on web; native already uses the system sans.
const AXIS_FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' : undefined;

/** Compact naira for axis labels: ₦1.2m, ₦45k. */
export function shortNaira(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `₦${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
  if (abs >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return `₦${Math.round(n)}`;
}

/** Rounds the axis maximum up to a clean number so gridlines land on readable values. */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= max) ?? 10;
  return step * pow;
}

interface TrendProps {
  data: TrendPoint[];
  height?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
}

/**
 * Bar chart (primary series) with an optional line overlay. Sized from its
 * container, and x-axis labels are thinned so they never overlap on phones.
 */
export function TrendChart({ data, height = 180, primaryLabel, secondaryLabel }: TrendProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const hasSecondary = data.some((d) => d.secondary !== undefined && d.secondary > 0);
  const max = niceMax(Math.max(0, ...data.map((d) => Math.max(d.value, d.secondary ?? 0))));
  const axisW = 44;
  const bottom = 22;
  const plotW = Math.max(0, width - axisW);
  const plotH = height - bottom;
  const slot = data.length > 0 ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(28, slot * 0.62));
  const maxLabels = Math.max(2, Math.floor(plotW / 56));
  const every = Math.max(1, Math.ceil(data.length / maxLabels));
  const y = (v: number) => plotH - (v / max) * plotH;

  const linePath = hasSecondary
    ? data.map((d, i) => `${i === 0 ? 'M' : 'L'}${axisW + slot * i + slot / 2},${y(d.secondary ?? 0)}`).join(' ')
    : '';

  return (
    <View>
      <View onLayout={onLayout} style={{ height }} accessibilityRole="image" accessibilityLabel={primaryLabel ? `${primaryLabel} chart` : 'Chart'}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {[0, 0.5, 1].map((f) => (
              <Line key={f} x1={axisW} x2={width} y1={y(max * f)} y2={y(max * f)} stroke={colors.border} strokeWidth={1} />
            ))}
            {[0, 0.5, 1].map((f) => (
              <SvgText key={`l${f}`} x={axisW - 6} y={y(max * f) + 4} fontSize={10} fontFamily={AXIS_FONT} fill={colors.textSubtle} textAnchor="end">
                {shortNaira(max * f)}
              </SvgText>
            ))}
            {data.map((d, i) => {
              const h = d.value > 0 ? Math.max(2, (d.value / max) * plotH) : 0;
              return (
                <Rect
                  key={i}
                  x={axisW + slot * i + (slot - barW) / 2}
                  y={plotH - h}
                  width={barW}
                  height={h}
                  rx={Math.min(4, barW / 2)}
                  fill={colors.primary}
                />
              );
            })}
            {hasSecondary ? <Path d={linePath} stroke={colors.warning} strokeWidth={2} fill="none" /> : null}
            {data.map((d, i) =>
              i % every === 0 || i === data.length - 1 ? (
                <SvgText key={`x${i}`} x={axisW + slot * i + slot / 2} y={height - 6} fontSize={10} fontFamily={AXIS_FONT} fill={colors.textSubtle} textAnchor="middle">
                  {d.label}
                </SvgText>
              ) : null,
            )}
          </Svg>
        ) : null}
      </View>
      {primaryLabel || (hasSecondary && secondaryLabel) ? (
        <View style={styles.legend}>
          {primaryLabel ? <LegendItem color={colors.primary} label={primaryLabel} /> : null}
          {hasSecondary && secondaryLabel ? <LegendItem color={colors.warning} label={secondaryLabel} line /> : null}
        </View>
      ) : null}
    </View>
  );
}

function LegendItem({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[line ? styles.legendLine : styles.legendDot, { backgroundColor: color }]} />
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

/** Labelled horizontal bars for breakdowns (expense categories, payment mix). */
export function BarList({ items, format }: { items: { label: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={styles.barList}>
      {items.map((item) => (
        <View key={item.label} style={styles.barRow} accessibilityLabel={`${item.label}: ${format(item.value)}`}>
          <View style={styles.barHead}>
            <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
              {item.label}
            </AppText>
            <AppText variant="bodyStrong">{format(item.value)}</AppText>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(item.value / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLine: { width: 14, height: 3, borderRadius: 2 },
  barList: { gap: spacing.sm + 4 },
  barRow: { gap: spacing.xs + 2 },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
});
