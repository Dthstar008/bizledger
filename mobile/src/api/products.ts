import { apiClient } from './client';
import { Product } from './types';

export function listProducts() {
  return apiClient.get<Product[]>('/products').then((r) => r.data);
}

export function createProduct(payload: {
  name: string;
  sku?: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  lowStockThreshold?: number;
}) {
  return apiClient.post<Product>('/products', payload).then((r) => r.data);
}
