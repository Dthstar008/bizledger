import { Image, ImageStyle, StyleSheet } from 'react-native';
import { Product } from '../api/types';
import { useProductImageUri } from '../offline/image-cache';
import { colors, radius } from '../theme';

const placeholder = require('../../assets/product-placeholder.png');

interface Props {
  product: Pick<Product, 'id' | 'imageUpdatedAt' | 'name'>;
  size?: number;
  /** Overrides the stored photo, e.g. a freshly picked local file being previewed. */
  localUri?: string | null;
  style?: ImageStyle;
}

/** Product photo (saved on the phone after the first download), or the BizLedger placeholder when there isn't one. */
export function ProductImage({ product, size = 44, localUri, style }: Props) {
  const saved = useProductImageUri(product);
  const uri = localUri ?? saved;
  return (
    <Image
      source={uri ? { uri } : placeholder}
      accessibilityLabel={product.imageUpdatedAt || localUri ? `Photo of ${product.name}` : `${product.name} (no photo)`}
      style={[styles.image, { width: size, height: size, borderRadius: size > 80 ? radius.lg : radius.md }, style]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.primaryMuted },
});
