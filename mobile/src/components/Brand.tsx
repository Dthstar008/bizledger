import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { AppText } from './AppText';
import { colors, spacing } from '../theme';

/** BizLedger mark: three ledger rows and a rising tick. */
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    // Decorative: hidden from screen readers (aria-hidden works on iOS, Android and web).
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Rect width="60" height="60" rx="16" fill={colors.primary} />
        <Path d="M14 21 H34" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
        <Path d="M14 31 H42" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
        <Path d="M14 41 H28" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
        <Path d="M33 44 L39 38 L43 41 L49 32" stroke={colors.primaryMuted} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}

/** Centred mark + "BizLedger" wordmark in brand green, used on auth screens. */
export function BrandLockup({ size = 56 }: { size?: number }) {
  return (
    <View style={styles.lockup} accessible accessibilityRole="header" accessibilityLabel="BizLedger">
      <BrandMark size={size} />
      <AppText variant="display" tone="primary" style={styles.word}>
        BizLedger
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { alignItems: 'center', gap: spacing.sm + 2 },
  word: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6 },
});
