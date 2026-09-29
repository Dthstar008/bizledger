import { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, shadow, spacing } from '../theme';

interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/** The single surface style used for every card, list container and form group. */
export function Card({ children, onPress, style, accessibilityLabel }: CardProps) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
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
  style?: ViewStyle;
}

export function Section({ title, action, description, card = true, children, style }: SectionProps) {
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm + 4,
    ...shadow.card,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  section: { gap: spacing.sm + 2 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  flex: { flex: 1, gap: spacing.xxs },
});
