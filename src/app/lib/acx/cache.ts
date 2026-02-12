type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type CacheOptions = {
  maxSize?: number;
  ttlMs?: number;
};

export class TtlLruCache<T> {
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(options: CacheOptions = {}) {
    this.maxSize = Math.max(1, options.maxSize ?? 2000);
    this.ttlMs = Math.max(1000, options.ttlMs ?? 60_000);
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    // refresh recency
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    this.evictIfNeeded();
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  size(): number {
    return this.store.size;
  }

  async getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
    const hit = this.get(key);
    if (hit !== null) return hit;

    const value = await loader();
    this.set(key, value);
    return value;
  }

  private evictIfNeeded(): void {
    while (this.store.size > this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (!oldest) break;
      this.store.delete(oldest);
    }
  }
}

export const effectivePermissionsCache = new TtlLruCache<unknown>({
  maxSize: 4000,
  ttlMs: Number(process.env.AUTHZ_V2_CACHE_TTL_MS ?? 30_000),
});

export function invalidateEffectivePermissionsCacheForUser(userId: string): void {
  const marker = `user:${userId}|`;
  for (const key of effectivePermissionsCache.keys()) {
    if (key.includes(marker)) {
      effectivePermissionsCache.delete(key);
    }
  }
}

export function clearEffectivePermissionsCache(): void {
  effectivePermissionsCache.clear();
}

