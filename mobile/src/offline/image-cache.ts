import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { apiBaseUrl, authHeaders } from '../api/client';
import { productImageUrl } from '../api/products';
import { ensureServerAwake } from '../api/server-status';
import { Product } from '../api/types';
import { useConnection } from './connection';

/**
 * Product photos, downloaded once with the user's sign-in and kept on the
 * phone, so lists show them straight away and they still appear offline.
 *
 * Photos are private to the business, so the server needs the auth header.
 * Rather than relying on <Image> sending headers (it doesn't on the web, and
 * a failed load used to leave the placeholder for good), each photo is
 * fetched here, saved as a file, and <Image> just shows the file.
 *
 * A file is named after the product and its photo version (imageUpdatedAt),
 * so a replaced photo is fetched again and the old file removed.
 */

type ImageProduct = Pick<Product, 'id' | 'imageUpdatedAt'>;

const isWeb = Platform.OS === 'web';
const MAX_PARALLEL = 4;
/** After a failed download, wait this long before trying the same photo again. */
const RETRY_AFTER_MS = 30_000;

const ready = new Map<string, string>(); // version key -> local uri
const inflight = new Map<string, Promise<string | null>>();
const failedAt = new Map<string, number>();
const listeners = new Set<() => void>();
let active = 0;
const waiting: (() => void)[] = [];

function versionKey(p: ImageProduct): string | null {
  if (!p.imageUpdatedAt) return null;
  const t = Date.parse(p.imageUpdatedAt);
  return `${p.id}-${Number.isNaN(t) ? p.imageUpdatedAt.replace(/\W/g, '') : t}`;
}

let dir: Directory | null = null;
function imageDir(): Directory {
  if (!dir) {
    dir = new Directory(Paths.document, 'product-images');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

/** Removes older saved versions of this product's photo. */
function removeOldVersions(productId: string, keep: string) {
  try {
    for (const entry of imageDir().list()) {
      if (entry instanceof File && entry.name.startsWith(`${productId}-`) && entry.name !== keep) entry.delete();
    }
  } catch {
    // Leftover files only cost a little space.
  }
}

async function download(p: ImageProduct, key: string): Promise<string | null> {
  const url = productImageUrl(p);
  if (!url) return null;
  return slot(async () => {
    await ensureServerAwake(apiBaseUrl);
    if (isWeb) {
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(`photo ${res.status}`);
      return URL.createObjectURL(await res.blob());
    }
    const name = `${key}.img`;
    const target = new File(imageDir(), name);
    const partial = new File(imageDir(), `${name}.part`);
    if (partial.exists) partial.delete();
    const saved = await File.downloadFileAsync(url, partial, { headers: authHeaders(), idempotent: true });
    // An error page (e.g. 404 HTML) is small text; a real photo is never this small.
    if (!saved.exists || (saved.size ?? 0) < 64) {
      if (saved.exists) saved.delete();
      throw new Error('photo download failed');
    }
    if (target.exists) target.delete();
    await saved.move(target);
    removeOldVersions(p.id, name);
    return target.uri;
  });
}

/** Local uri for the product's photo if it's already on the phone; never touches the network. */
function savedUri(p: ImageProduct, key: string): string | null {
  const hit = ready.get(key);
  if (hit) return hit;
  if (isWeb) return null;
  try {
    const file = new File(imageDir(), `${key}.img`);
    if (file.exists) {
      ready.set(key, file.uri);
      return file.uri;
    }
  } catch {
    // Treat as not saved yet.
  }
  return null;
}

/** Fetches (or reuses) the product's photo. Resolves null when there is none or it can't be fetched now. */
export function loadProductImage(p: ImageProduct): Promise<string | null> {
  const key = versionKey(p);
  if (!key) return Promise.resolve(null);
  const saved = savedUri(p, key);
  if (saved) return Promise.resolve(saved);
  const pending = inflight.get(key);
  if (pending) return pending;
  if (Date.now() - (failedAt.get(key) ?? 0) < RETRY_AFTER_MS) return Promise.resolve(null);
  if (!useConnection.getState().deviceOnline) return Promise.resolve(null);

  const job = download(p, key)
    .then((uri) => {
      if (uri) {
        ready.set(key, uri);
        failedAt.delete(key);
        listeners.forEach((fn) => fn());
      }
      return uri;
    })
    .catch(() => {
      failedAt.set(key, Date.now());
      return null;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

/** Downloads every photo in the list in the background, so they're there next time (including offline). */
export function prefetchProductImages(products: ImageProduct[]) {
  for (const p of products) if (p.imageUpdatedAt) void loadProductImage(p);
}

/**
 * The local uri to show for a product's photo: null while it loads, when it
 * has none, or when it can't be fetched (the placeholder shows instead).
 */
export function useProductImageUri(p: ImageProduct): string | null {
  const key = versionKey(p);
  const [uri, setUri] = useState<string | null>(() => (key ? savedUri(p, key) : null));
  const online = useConnection((s) => s.deviceOnline);

  useEffect(() => {
    let alive = true;
    if (!key) {
      setUri(null);
      return;
    }
    const now = savedUri(p, key);
    setUri(now);
    if (!now) void loadProductImage(p).then((u) => alive && u && setUri(u));
    // A photo that failed earlier gets another chance when it's needed again.
    const retry = () => {
      const hit = ready.get(key);
      if (hit && alive) setUri(hit);
    };
    listeners.add(retry);
    return () => {
      alive = false;
      listeners.delete(retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, online]);

  return uri;
}

/** On log out: photos belong to the business, so they're removed from the phone. */
export function clearProductImages() {
  ready.clear();
  failedAt.clear();
  if (isWeb) return;
  try {
    const d = new Directory(Paths.document, 'product-images');
    if (d.exists) d.delete();
  } catch {
    // Nothing else to do.
  }
  dir = null;
}
