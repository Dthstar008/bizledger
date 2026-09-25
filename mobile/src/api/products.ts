import { apiClient } from './client';
import { Product } from './types';

export function listProducts() {
  return apiClient.get<Product[]>('/products').then((r) => r.data);
}

export function createProduct(payload: {
  name: string;
  sku?: string;
  barcode?: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  lowStockThreshold?: number;
}) {
  return apiClient.post<Product>('/products', payload).then((r) => r.data);
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
