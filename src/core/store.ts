// ==========================================
// FILE: src/core/store.ts
// ==========================================

import type { proto, WAMessageKey, GroupMetadata } from '@whiskeysockets/baileys';
import { config } from '../config';

interface CacheEntry<V> {
  value: V;
  expiresAt: number; // 0 denotes permanent / no TTL
}

export class BoundedMemoryStore<K, V> {
  private readonly max: number;
  private readonly ttlMs: number;
  private readonly store: Map<K, CacheEntry<V>>;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxSize = 2500, ttlMs = 0) {
    this.max = Math.max(1, maxSize);
    this.ttlMs = Math.max(0, ttlMs);
    this.store = new Map();

    if (this.ttlMs > 0) {
      this.sweepTimer = setInterval(() => this.prune(), 60_000);
      if (typeof this.sweepTimer.unref === 'function') {
        this.sweepTimer.unref();
      }
    }
  }

  public set(key: K, value: V, customTtlMs?: number): void {
    const ttl = customTtlMs !== undefined ? customTtlMs : this.ttlMs;
    const expiresAt = ttl > 0 ? Date.now() + ttl : 0;

    const existing = this.store.get(key);
    if (existing) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      this.store.delete(key);
      this.store.set(key, existing);
      return;
    }

    if (this.store.size >= this.max) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }

    this.store.set(key, { value, expiresAt });
  }

  public get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt !== 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  public has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  public delete(key: K): boolean {
    return this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public size(): number {
    return this.store.size;
  }

  public keys(): K[] {
    return Array.from(this.store.keys());
  }

  public prune(): number {
    const now = Date.now();
    let prunedCount = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt !== 0 && now > entry.expiresAt) {
        this.store.delete(key);
        prunedCount++;
      }
    }
    return prunedCount;
  }

  public destroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    this.store.clear();
  }
}

export interface CachedGroupData {
  readonly metadata: GroupMetadata;
  readonly adminSet: ReadonlySet<string>;
}

export const messageStore = new BoundedMemoryStore<string, proto.IMessage>(
  config.maxMemoryStoreSize,
  24 * 60 * 60 * 1000 // 24 Hours TTL
);

export const groupCache = new BoundedMemoryStore<string, CachedGroupData>(
  1000,
  15 * 60 * 1000 // 15 Minutes TTL
);

export const getMessageCallback = async (key: WAMessageKey): Promise<proto.IMessage | undefined> => {
  if (!key.id) return undefined;
  return messageStore.get(key.id);
};
