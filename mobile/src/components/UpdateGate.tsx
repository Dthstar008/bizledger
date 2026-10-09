import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Button } from './Button';
import { BrandMark } from './Brand';
import { APP_VERSION, useAppStatus } from '../store/app-status-store';
import { colors, radius, shadow, spacing } from '../theme';

/**
 * Covers the whole app when the server says this version is no longer
 * supported, and shows a small banner when a newer optional version exists.
 * Driven entirely by the server (/app/config and 426 responses), so nothing
 * here decides on its own that an update is needed.
 */
export function UpdateGate() {
  const insets = useSafeAreaInsets();
  const { updateRequired, updateAvailable, bannerDismissed, minVersion, latestVersion, updateUrl, dismissBanner } = useAppStatus();
  const openUpdate = () => updateUrl && Linking.openURL(updateUrl);

  if (updateRequired) {
    return (
      <View style={[styles.cover, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]} accessibilityViewIsModal>
        <View style={styles.center}>
          <BrandMark size={64} />
          <AppText variant="title" align="center">
            Update BizLedger to continue
          </AppText>
          <AppText tone="muted" align="center">
            This version ({APP_VERSION}) is no longer supported{minVersion ? `. Version ${minVersion} or newer is needed` : ''}. Your records are safe; they will be
            there when you sign in on the new version.
          </AppText>
        </View>
        {updateUrl ? (
          <Button label="Install update" icon="download-outline" onPress={openUpdate} fullWidth />
        ) : (
          <AppText tone="muted" align="center">
            Ask the person who gave you BizLedger for the latest version.
          </AppText>
        )}
      </View>
    );
  }

  if (updateAvailable && !bannerDismissed) {
    return (
      <View pointerEvents="box-none" style={[styles.bannerWrap, { bottom: insets.bottom + 72 }]}>
        <View style={styles.banner}>
          <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">A new version is available</AppText>
            <AppText variant="caption" tone="muted">
              Version {latestVersion} has improvements and fixes.
            </AppText>
          </View>
          {updateUrl ? <Button label="Update" size="sm" onPress={openUpdate} /> : null}
          <Pressable onPress={dismissBanner} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={12} style={styles.dismiss}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    zIndex: 100,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, maxWidth: 420, alignSelf: 'center' },
  bannerWrap: { position: 'absolute', left: spacing.md, right: spacing.md, alignItems: 'center', zIndex: 50 },
  banner: {
    width: '100%',
    maxWidth: 560,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.raised,
  },
  flex: { flex: 1, gap: 2 },
  dismiss: { padding: spacing.xs },
});
