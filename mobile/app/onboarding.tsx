import { ComponentProps, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { BrandMark } from '../src/components/Brand';
import { usePrefs } from '../src/store/prefs-store';
import { useLayout } from '../src/hooks/useLayout';
import { colors, radius, spacing } from '../src/theme';

type Icon = ComponentProps<typeof Ionicons>['name'];

const SLIDES: { hero: Icon; orbit: Icon[]; title: string; body: string }[] = [
  {
    hero: 'storefront',
    orbit: ['receipt-outline', 'cube-outline', 'people-outline', 'wallet-outline'],
    title: 'Your whole business in one place',
    body: 'Record sales, keep track of stock, follow up on customer debts and log expenses, all from your phone.',
  },
  {
    hero: 'bar-chart',
    orbit: ['trending-up-outline', 'cash-outline', 'pie-chart-outline', 'calendar-outline'],
    title: 'See how you are really doing',
    body: 'Revenue, expenses and profit update the moment you sell, so you can spot trends and your best products at a glance.',
  },
  {
    hero: 'shield-checkmark',
    orbit: ['time-outline', 'document-text-outline', 'people-circle-outline', 'checkmark-done-outline'],
    title: 'Stay organised as you grow',
    body: 'Every sale, payment and stock change is recorded automatically, so your records are always complete and easy to trust.',
  },
];

const ORBIT_POSITIONS = [
  { top: 0, left: 18 },
  { top: 18, right: 0 },
  { bottom: 6, right: 22 },
  { bottom: 18, left: 0 },
];

function Illustration({ hero, orbit }: { hero: Icon; orbit: Icon[] }) {
  return (
    <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.ring} />
      <View style={styles.hero}>
        <Ionicons name={hero} size={56} color={colors.primary} />
      </View>
      {orbit.map((icon, i) => (
        <View key={icon} style={[styles.orbit, ORBIT_POSITIONS[i]]}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const { width } = useLayout();
  const markSeen = usePrefs((s) => s.markOnboardingSeen);
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };
  const finish = (to: '/register' | '/login') => {
    markSeen();
    router.replace(to);
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <BrandMark size={32} />
        {!last ? (
          <Pressable onPress={() => finish('/login')} accessibilityRole="button" accessibilityLabel="Skip introduction" hitSlop={12} style={styles.skip}>
            <AppText variant="bodyStrong" tone="muted">
              Skip
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.flex}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <Illustration hero={s.hero} orbit={s.orbit} />
            <View style={styles.copy}>
              <AppText variant="display" align="center" accessibilityRole="header">
                {s.title}
              </AppText>
              <AppText tone="muted" align="center" style={styles.body}>
                {s.body}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots} accessible accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        {last ? (
          <View style={styles.finalActions}>
            <Button label="Get started" onPress={() => finish('/register')} fullWidth />
            <Button label="I already have an account" variant="ghost" onPress={() => finish('/login')} fullWidth />
          </View>
        ) : (
          <View style={styles.nav}>
            {index > 0 ? <Button label="Back" variant="secondary" icon="arrow-back" onPress={() => goTo(index - 1)} /> : <View />}
            <Button label="Next" icon="arrow-forward" onPress={() => goTo(index + 1)} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    minHeight: 48,
  },
  skip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.xl },
  illustration: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  hero: { width: 120, height: 120, borderRadius: 36, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  orbit: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: spacing.sm + 4, maxWidth: 440 },
  body: { fontSize: 16, lineHeight: 23 },
  bottom: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.lg, width: '100%', maxWidth: 480, alignSelf: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotActive: { width: 24, backgroundColor: colors.primary },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finalActions: { gap: spacing.xs },
});
