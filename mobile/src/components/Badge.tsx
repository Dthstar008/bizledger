import { ComponentProps } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Colors, fonts, radius, spacing } from '../theme';
import { makeStyles, useTheme } from '../theming';

/** warning and gold are the same gold family (part-paid, low stock, owed to you). */
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'gold' | 'danger' | 'info';

const toneKeys: Record<BadgeTone, { bg: keyof Colors; fg: keyof Colors }> = {
  neutral: { bg: 'surfaceAlt', fg: 'textMuted' },
  success: { bg: 'primaryMuted', fg: 'primary' },
  warning: { bg: 'goldMuted', fg: 'goldDeep' },
  gold: { bg: 'goldMuted', fg: 'goldDeep' },
  danger: { bg: 'dangerMuted', fg: 'danger' },
  info: { bg: 'infoMuted', fg: 'info' },
};

/** Small status pill. An icon makes the status readable without colour. */
export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: ComponentProps<typeof Ionicons>['name'] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const k = toneKeys[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors[k.bg] }]}>
      {icon ? <Ionicons name={icon} size={12} color={colors[k.fg]} /> : null}
      <AppText variant="caption" style={[styles.text, { color: colors[k.fg] }]} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  text: { fontFamily: fonts.semibold },
}));
