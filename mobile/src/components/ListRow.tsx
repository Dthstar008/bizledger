import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, spacing, touch } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  /** Right-aligned value (amount, badge). */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Hide the separator on the last row of a card. */
  last?: boolean;
  accessibilityLabel?: string;
}

/** A row inside a Card list: leading visual, two lines of text, trailing value, optional chevron. */
export function ListRow({ title, subtitle, leading, trailing, onPress, last, accessibilityLabel }: Props) {
  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null}
    </>
  );
  return (
    <View style={[styles.wrap, !last && styles.separator]}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.row}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  row: { minHeight: touch.min + 12, flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: spacing.sm },
  pressed: { opacity: 0.6 },
  text: { flex: 1, gap: spacing.xxs },
});
