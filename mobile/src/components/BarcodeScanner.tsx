import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppText } from './AppText';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { colors, radius, spacing } from '../theme';

interface Props {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ visible, onScanned, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  // The camera fires continuously while a code is in view; only report the first.
  const handled = useRef(false);

  useEffect(() => {
    if (visible) handled.current = false;
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {permission?.granted ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
              }}
              onBarcodeScanned={({ data }) => {
                if (handled.current || !data) return;
                handled.current = true;
                onScanned(data);
              }}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <AppText variant="bodyStrong" style={styles.light}>
                Point the camera at a barcode
              </AppText>
              <AppText variant="caption" style={styles.dim}>
                It scans automatically
              </AppText>
            </View>
          </>
        ) : (
          <View style={styles.permission}>
            <View style={styles.permissionIcon}>
              <Ionicons name="camera-outline" size={32} color={colors.primary} />
            </View>
            <AppText variant="heading" align="center" style={styles.light}>
              Camera access needed
            </AppText>
            <AppText align="center" style={styles.dim}>
              {permission && !permission.canAskAgain
                ? 'Camera access is turned off. Turn it on in your phone settings to scan barcodes.'
                : 'BizLedger uses the camera only to scan product barcodes.'}
            </AppText>
            {!permission || permission.canAskAgain ? <Button label="Allow camera" icon="camera-outline" onPress={requestPermission} /> : null}
          </View>
        )}
        <View style={[styles.close, { top: insets.top + spacing.sm }]}>
          <IconButton icon="close" variant="filled" accessibilityLabel="Close scanner" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  frame: {
    width: '80%',
    maxWidth: 360,
    height: 180,
    borderWidth: 3,
    borderColor: colors.onPrimary,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  light: { color: colors.onPrimary },
  dim: { color: 'rgba(255,255,255,0.75)' },
  permission: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: { position: 'absolute', right: spacing.md },
});
