import { useState } from 'react';
import { Image, ImageStyle, StyleSheet } from 'react-native';
import { authHeaders } from '../api/client';
import { productImageUrl } from '../api/products';
import { Product } from '../api/types';
import { colors, radius } from '../theme';

const placeholder = require('../../assets/product-placeholder.png');

interface Props {
  product: Pick<Product, 'id' | 'imageUpdatedAt' | 'name'>;
  size?: number;
  /** Overrides the stored photo, e.g. a freshly picked local file being previewed. */
  localUri?: string | null;
  style?: ImageStyle;
}

/** Product photo (fetched with the user's auth), or the BizLedger placeholder when there isn't one. */
export function ProductImage({ product, size = 44, localUri, style }: Props) {
  const [failed, setFailed] = useState(false);
  const remote = productImageUrl(product);
  const source = localUri ? { uri: localUri } : remote && !failed ? { uri: remote, headers: authHeaders() } : placeholder;
  return (
    <Image
      source={source}
      onError={() => setFailed(true)}
      accessibilityLabel={remote || localUri ? `Photo of ${product.name}` : `${product.name} (no photo)`}
      style={[styles.image, { width: size, height: size, borderRadius: size > 80 ? radius.lg : radius.md }, style]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.primaryMuted },
});
