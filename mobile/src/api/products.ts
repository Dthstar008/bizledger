import { apiBaseUrl, apiClient } from './client';
import { Product } from './types';

export interface ProductInput {
  name: string;
  sku?: string;
  barcode?: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  lowStockThreshold?: number;
}

export function listProducts() {
  return apiClient.get<Product[]>('/products').then((r) => r.data);
}

export function getProduct(id: string) {
  return apiClient.get<Product>(`/products/${id}`).then((r) => r.data);
}

export function createProduct(payload: ProductInput) {
  return apiClient.post<Product>('/products', payload).then((r) => r.data);
}

/** Owner only. A stock change is recorded as an INVENTORY_ADJUSTED event with the reason. */
export function updateProduct(id: string, payload: Partial<ProductInput> & { stockAdjustmentReason?: string }) {
  return apiClient.patch<Product>(`/products/${id}`, payload).then((r) => r.data);
}

/** Owner only. Fails with a clear message if the product has ever been sold. */
export function deleteProduct(id: string) {
  return apiClient.delete(`/products/${id}`).then(() => undefined);
}

/** Uploads a local image file (already resized on the device) as the product photo. */
export function uploadProductImage(id: string, file: { uri: string; mimeType?: string }) {
  const form = new FormData();
  const type = file.mimeType ?? 'image/jpeg';
  // React Native's FormData accepts { uri, name, type } for files on device.
  form.append('image', { uri: file.uri, name: `product.${type.split('/')[1] ?? 'jpg'}`, type } as unknown as Blob);
  return apiClient
    .put<Product>(`/products/${id}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 })
    .then((r) => r.data);
}

export function removeProductImage(id: string) {
  return apiClient.delete<Product>(`/products/${id}/image`).then((r) => r.data);
}

/** URL for <Image> (needs the auth header); the version busts caches after a photo change. */
export function productImageUrl(product: Pick<Product, 'id' | 'imageUpdatedAt'>): string | null {
  if (!product.imageUpdatedAt) return null;
  return `${apiBaseUrl}/products/${product.id}/image?v=${encodeURIComponent(product.imageUpdatedAt)}`;
}

/** Returns null when nothing is registered under this barcode. */
export function findProductByBarcode(code: string) {
  return apiClient
    .get<Product>(`/products/barcode/${encodeURIComponent(code)}`)
    .then((r) => r.data)
    .catch((err) => {
      if (err?.response?.status === 404) return null;
      throw err;
    });
}
