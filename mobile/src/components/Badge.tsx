import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

const palette: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
  success: { bg: colors.primaryMuted, fg: colors.primary },
  warning: { bg: colors.warningMuted, fg: colors.warning },
  danger: { bg: colors.dangerMuted, fg: colors.danger },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  return (
    <View style={[styles.badge, { backgroundColor: palette[tone].bg }]}>
      <AppText variant="label" style={[styles.text, { color: palette[tone].fg }]} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  text: { fontSize: 12, lineHeight: 16 },
});
