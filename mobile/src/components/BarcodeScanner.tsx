import { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button } from './Button';
import { colors, radius, spacing } from '../theme';

interface Props {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ visible, onScanned, onClose }: Props) {
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
            <View style={styles.frame} pointerEvents="none" />
            <Text style={styles.hint}>Point the camera at a barcode</Text>
          </>
        ) : (
          <View style={styles.permission}>
            <Text style={styles.permissionText}>
              {permission && !permission.canAskAgain
                ? 'Camera access is turned off. Enable it in your phone settings to scan barcodes.'
                : 'BizLedger needs camera access to scan product barcodes.'}
            </Text>
            {(!permission || permission.canAskAgain) && <Button label="Allow camera" onPress={requestPermission} />}
          </View>
        )}
        <Pressable style={styles.close} onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  frame: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: 180,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: radius.md,
  },
  hint: {
    position: 'absolute',
    top: '30%',
    marginTop: 200,
    alignSelf: 'center',
    color: '#fff',
    fontSize: 15,
  },
  permission: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  close: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  closeText: { color: colors.text, fontWeight: '700' },
});
