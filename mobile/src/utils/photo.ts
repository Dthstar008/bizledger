import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface PickedPhoto {
  uri: string;
  mimeType: string;
}

export type PhotoResult = { photo: PickedPhoto } | { cancelled: true } | { error: string };

// Phone photos are several MB; product thumbnails never need more than this.
const MAX_WIDTH = 800;

/**
 * Lets the user take or choose a square product photo, then shrinks it to
 * ~800px JPEG on the device so uploads stay small and fast on mobile data.
 */
export async function pickProductPhoto(source: 'camera' | 'library'): Promise<PhotoResult> {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      error:
        source === 'camera'
          ? 'BizLedger needs camera access to take product photos. You can turn it on in your phone settings.'
          : 'BizLedger needs access to your photos to choose a product picture. You can turn it on in your phone settings.',
    };
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return { cancelled: true };

  const asset = result.assets[0];
  const resized = await manipulateAsync(
    asset.uri,
    asset.width && asset.width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [],
    { compress: 0.7, format: SaveFormat.JPEG },
  );
  return { photo: { uri: resized.uri, mimeType: 'image/jpeg' } };
}
