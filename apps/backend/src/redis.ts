// Redis is optional. For this setup we use in-memory fallback.
export async function connectRedis(): Promise<void> {
  throw new Error('Redis unavailable');
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  void key;
  return null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  void key;
  void value;
  void ttlSeconds;
}

export async function cacheDel(pattern: string): Promise<void> {
  void pattern;
}
