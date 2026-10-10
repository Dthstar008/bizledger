import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from './AppText';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { fonts, spacing } from '../theme';
import { makeStyles, useTheme } from '../theming';
import { successHaptic } from '../utils/haptics';

// The logo exactly as designed (assets/brand/logo.svg): never redrawn or recoloured.
// It carries its own green tile, so it is used as-is on light and dark surfaces.
const LOGO = require('../../assets/brand/logo.png');

/** The BizLedger app tile. Decorative wherever a text name is also present. */
export function BrandMark({ size = 56 }: { size?: number }) {
  return <Image source={LOGO} style={{ width: size, height: size }} accessibilityIgnoresInvertColors aria-hidden resizeMode="contain" />;
}

/** Centred logo + "BizLedger" wordmark in brand green, used on auth screens. */
export function BrandLockup({ size = 64 }: { size?: number }) {
  const styles = useStyles();
  return (
    <View style={styles.lockup} accessible accessibilityRole="header" accessibilityLabel="BizLedger">
      <BrandMark size={size} />
      <AppText variant="display" tone="primary" style={styles.word}>
        BizLedger
      </AppText>
    </View>
  );
}

/**
 * The gold check badge from the logo: BizLedger's one "confirmed" stamp. Used
 * for recorded, settled and verified moments only, never as decoration.
 */
export function GoldCheck({ size = 24, accessibilityLabel }: { size?: number; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  return (
    <View accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} aria-hidden={!accessibilityLabel}>
      <Svg width={size} height={size} viewBox="0 0 292 292">
        <Circle cx="146" cy="146" r="132" fill={colors.gold} stroke={colors.primary} strokeWidth="28" />
        <Path d="M82 150 L130 198 L216 96" fill="none" stroke={colors.onGold} strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/**
 * The signature moment: the gold check stamps in (0.6 → 1.1 → 1 with a soft
 * ring pulse) and the phone gives a success tap. With "reduce motion" on it
 * simply fades in.
 */
export function GoldCheckStamp({ size = 88, accessibilityLabel = 'Done' }: { size?: number; accessibilityLabel?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(reduced ? 1 : 0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';

  useEffect(() => {
    successHaptic();
    if (reduced) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: native }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: native }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: native }),
      ]),
      Animated.timing(ring, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: native }),
    ]).start();
  }, [native, opacity, reduced, ring, scale]);

  return (
    <View style={[styles.stamp, { width: size * 1.6, height: size * 1.6 }]} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {!reduced ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: colors.gold,
              opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
            },
          ]}
        />
      ) : null}
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <GoldCheck size={size} />
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  lockup: { alignItems: 'center', gap: spacing.sm + 4 },
  word: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  stamp: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 3 },
}));
