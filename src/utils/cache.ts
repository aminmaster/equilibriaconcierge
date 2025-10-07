// Cache utility with TTL (Time To Live)
class Cache {
  private cache: Map<string, { data: any; expiry: number }>;
  private defaultTtl: number;

  constructor(defaultTtl: number = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
  }

  set(key: string, data: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTtl);
    this.cache.set(key, { data, expiry });
  }

  get(key: string): any {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Create instances for different types of data
export const apiCache = new Cache(5 * 60 * 1000); // 5 minutes for API data
export const modelCache = new Cache(10 * 60 * 1000); // 10 minutes for model data
export const userCache = new Cache(30 * 60 * 1000); // 30 minutes for user data

// Periodic cleanup (every 5 minutes)
setInterval(() => {
  apiCache.cleanup();
  modelCache.cleanup();
  userCache.cleanup();
}, 5 * 60 * 1000);