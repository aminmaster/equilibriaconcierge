// Cache utility with TTL (Time To Live) and LRU eviction
class Cache {
  private cache: Map<string, { data: any; expiry: number; lastAccessed: number }>;
  private defaultTtl: number;
  private maxSize: number;

  constructor(defaultTtl: number = 5 * 60 * 1000, maxSize: number = 100) { // 5 minutes default, max 100 entries
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
    this.maxSize = maxSize;
  }

  set(key: string, data: any, ttl?: number): void {
    // If cache is at max size, remove least recently used item
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const expiry = Date.now() + (ttl || this.defaultTtl);
    this.cache.set(key, { data, expiry, lastAccessed: Date.now() });
  }

  get(key: string): any {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // Update last accessed time for LRU
    item.lastAccessed = Date.now();
    this.cache.set(key, item);
    
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

  // Evict least recently used item
  private evictLRU(): void {
    let lruKey: string | null = null;
    let oldestAccess = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestAccess) {
        oldestAccess = item.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  // Get cache statistics
  getStats(): { size: number; maxSize: number; utilization: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize) * 100
    };
  }
}

// Create instances for different types of data with appropriate sizing
export const apiCache = new Cache(5 * 60 * 1000, 50); // 5 minutes for API data, max 50 entries
export const modelCache = new Cache(10 * 60 * 1000, 20); // 10 minutes for model data, max 20 entries
export const userCache = new Cache(30 * 60 * 1000, 100); // 30 minutes for user data, max 100 entries

// Periodic cleanup (every 5 minutes)
setInterval(() => {
  apiCache.cleanup();
  modelCache.cleanup();
  userCache.cleanup();
}, 5 * 60 * 1000);