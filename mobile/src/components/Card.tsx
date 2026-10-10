import { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { radius, spacing } from '../theme';
import { makeStyles } from '../theming';

interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** paper: brand cream, for receipts and the read-only ledger. insight: gold-tinted callout. */
  tone?: 'default' | 'paper' | 'insight';
}

/** The single surface style used for every card, list container and form group. */
export function Card({ children, onPress, style, accessibilityLabel, tone = 'default' }: CardProps) {
  const styles = useStyles();
  const toneStyle = tone === 'paper' ? styles.paper : tone === 'insight' ? styles.insight : null;
  if (!onPress) return <View style={[styles.card, toneStyle, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, toneStyle, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

interface SectionProps extends PropsWithChildren {
  title: string;
  /** e.g. "See all" link on the right. */
  action?: ReactNode;
  description?: string;
  /** Wrap children in a Card (default). Pass false for grids of cards. */
  card?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Section({ title, action, description, card = true, children, style }: SectionProps) {
  const styles = useStyles();
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHead}>
        <View style={styles.flex}>
          <AppText variant="heading" accessibilityRole="header">
            {title}
          </AppText>
          {description ? (
            <AppText variant="caption" tone="muted">
              {description}
            </AppText>
          ) : null}
        </View>
        {action}
      </View>
      {card ? <Card>{children}</Card> : children}
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    gap: spacing.md,
    ...t.shadow.card,
  },
  paper: { backgroundColor: c.surfaceAlt },
  insight: { backgroundColor: c.goldMuted, borderColor: c.goldMuted },
  pressed: { backgroundColor: c.surfaceAlt },
  section: { gap: spacing.sm + 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  flex: { flex: 1, gap: spacing.xxs },
}));
