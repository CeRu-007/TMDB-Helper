interface StorageStats {
  cacheEntries: number;
  totalCacheSize: number;
}

class IndexedDBStorage {
  async getCache(key: string): Promise<any | null> {
    return null;
  }

  async setCache(key: string, value: any, ttl: number): Promise<void> {}

  async cleanupCache(): Promise<void> {}

  async transaction(storeName: string, mode: string): Promise<any> {
    return {
      clear: () => Promise.resolve(),
    };
  }

  async getStorageStats(): Promise<StorageStats> {
    return {
      cacheEntries: 0,
      totalCacheSize: 0,
    };
  }
}

export const indexedDBStorage = new IndexedDBStorage();
