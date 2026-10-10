import { Badge } from './Badge';
import { Product } from '../api/types';

export const isOutOfStock = (p: Pick<Product, 'stockQty'>) => p.stockQty <= 0;
export const isLowStock = (p: Pick<Product, 'stockQty' | 'lowStockThreshold'>) => !isOutOfStock(p) && p.stockQty <= p.lowStockThreshold;

export function StockBadge({ product }: { product: Pick<Product, 'stockQty' | 'lowStockThreshold'> }) {
  if (isOutOfStock(product)) return <Badge label="Out of stock" tone="danger" />;
  if (isLowStock(product)) return <Badge label={`Low · ${product.stockQty}`} tone="warning" />;
  return <Badge label={`${product.stockQty} in stock`} tone="success" />;
}
