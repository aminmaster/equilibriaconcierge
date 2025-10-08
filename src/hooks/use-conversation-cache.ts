import { useState, useEffect, useCallback } from "react";
import { get, set, del, keys, values } from "idb-keyval";
import { Conversation, Message } from "@/types/conversation";
import { v4 as uuidv4 } from 'uuid';

// Cache keys
const CACHE_NAMESPACE = "conversation-cache";
const CONVERSATIONS_KEY = `${CACHE_NAMESPACE}:conversations`;
const MESSAGES_KEY_PREFIX = `${CACHE_NAMESPACE}:messages:`;
const CACHE_VERSION = 1;
const MAX_CONVERSATIONS = 100; // Limit to prevent storage bloat
const MAX_MESSAGES_PER_CONVO = 1000; // Per conversation

// IndexedDB store name
const STORE_NAME = "conversations-store";

// Helper to generate cache keys
const getCacheKey = (key: string) => `${CACHE_NAMESPACE}:${key}`;

// Initialize IndexedDB store
const initDB = async () => {
  const dbReq = indexedDB.open(STORE_NAME, CACHE_VERSION);
  
  dbReq.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    if (!db.objectStoreNames.contains("data")) {
      const store = db.createObjectStore("data", { keyPath: "key" });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };
  
  return new Promise<IDBDatabase>((resolve, reject) => {
    dbReq.onsuccess = () => resolve(dbReq.result);
    dbReq.onerror = () => reject(dbReq.error);
  });
};

// Cache operations
const cacheOperations = {
  // Store conversations (array)
  setConversations: async (conversations: Conversation[]) => {
    const db = await initDB();
    const tx = db.transaction("data", "readwrite");
    const store = tx.objectStore("data");
    await store.put({ key: CONVERSATIONS_KEY, data: conversations, timestamp: Date.now() });
    db.close();
  },
  
  getConversations: async (): Promise<Conversation[] | null> => {
    const db = await initDB();
    const tx = db.transaction("data", "readonly");
    const store = tx.objectStore("data");
    const result = await store.get(CONVERSATIONS_KEY);
    db.close();
    return result?.data || null;
  },
  
  // Store messages for a conversation (array)
  setMessages: async (conversationId: string, messages: Message[]) => {
    const db = await initDB();
    const tx = db.transaction("data", "readwrite");
    const store = tx.objectStore("data");
    await store.put({ key: `${MESSAGES_KEY_PREFIX}${conversationId}`, data: messages, timestamp: Date.now() });
    db.close();
  },
  
  getMessages: async (conversationId: string): Promise<Message[] | null> => {
    const db = await initDB();
    const tx = db.transaction("data", "readonly");
    const store = tx.objectStore("data");
    const result = await store.get(`${MESSAGES_KEY_PREFIX}${conversationId}`);
    db.close();
    return result?.data || null;
  },
  
  // Evict LRU items (oldest first)
  evictLRU: async (maxSize: number) => {
    const db = await initDB();
    const tx = db.transaction("data", "readwrite");
    const store = tx.objectStore("data");
    const allItems = await store.index("timestamp").getAll();
    
    // Sort by timestamp (oldest first)
    const sortedItems = allItems.sort((a, b) => a.timestamp - b.timestamp);
    
    // Delete oldest until under limit
    for (const item of sortedItems) {
      if (allItems.length > maxSize) {
        await store.delete(item.key);
      } else {
        break;
      }
    }
    db.close();
  },
  
  // Clear all cache
  clear: async () => {
    const db = await initDB();
    const tx = db.transaction("data", "readwrite");
    const store = tx.objectStore("data");
    const allKeys = await store.getAllKeys();
    for (const key of allKeys) {
      await store.delete(key);
    }
    db.close();
  },
  
  // Get cache stats
  getStats: async () => {
    const db = await initDB();
    const tx = db.transaction("data", "readonly");
    const store = tx.objectStore("data");
    const count = await store.count();
    db.close();
    return { count };
  }
};

export const useConversationCache = () => {
  const [isCacheReady, setIsCacheReady] = useState(false);
  const [cacheStats, setCacheStats] = useState({ count: 0 });

  // Initialize cache on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        const stats = await cacheOperations.getStats();
        setCacheStats(stats);
        setIsCacheReady(true);
      } catch (error) {
        console.error("Failed to initialize cache:", error);
        setIsCacheReady(true); // Proceed without cache
      }
    };
    init();
  }, []);

  // Load conversations from cache
  const loadFromCache = useCallback(async (): Promise<Conversation[]> => {
    if (!isCacheReady) return [];
    try {
      const cached = await cacheOperations.getConversations();
      if (cached) {
        // Sort by updated_at (most recent first)
        return cached.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      }
      return [];
    } catch (error) {
      console.error("Cache load error:", error);
      return [];
    }
  }, [isCacheReady]);

  // Save conversations to cache
  const saveToCache = useCallback(async (conversations: Conversation[]) => {
    if (!isCacheReady) return;
    try {
      // Evict if over limit
      if (conversations.length > MAX_CONVERSATIONS) {
        await cacheOperations.evictLRU(MAX_CONVERSATIONS);
      }
      await cacheOperations.setConversations(conversations);
      const stats = await cacheOperations.getStats();
      setCacheStats(stats);
    } catch (error) {
      console.error("Cache save error:", error);
    }
  }, [isCacheReady]);

  // Load messages for a conversation from cache
  const loadMessagesFromCache = useCallback(async (conversationId: string): Promise<Message[]> => {
    if (!isCacheReady) return [];
    try {
      const cached = await cacheOperations.getMessages(conversationId);
      if (cached) {
        // Sort by created_at
        return cached.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
      return [];
    } catch (error) {
      console.error("Cache messages load error:", error);
      return [];
    }
  }, [isCacheReady]);

  // Save messages to cache
  const saveMessagesToCache = useCallback(async (conversationId: string, messages: Message[]) => {
    if (!isCacheReady) return;
    try {
      // Evict if over limit per convo
      if (messages.length > MAX_MESSAGES_PER_CONVO) {
        messages = messages.slice(-MAX_MESSAGES_PER_CONVO);
      }
      await cacheOperations.setMessages(conversationId, messages);
      const stats = await cacheOperations.getStats();
      setCacheStats(stats);
    } catch (error) {
      console.error("Cache messages save error:", error);
    }
  }, [isCacheReady]);

  // Merge server data with cache (prioritize server)
  const mergeWithCache = useCallback(async (serverConversations: Conversation[], serverMessagesMap: Map<string, Message[]>) => {
    const cachedConversations = await loadFromCache();
    const mergedConversations = [...serverConversations]; // Start with server data
    
    // For each server conversation, merge messages
    for (const convo of mergedConversations) {
      const cachedMessages = await loadMessagesFromCache(convo.id);
      const serverMessages = serverMessagesMap.get(convo.id) || [];
      
      // Merge: server messages override cached ones (by ID)
      const mergedMessages = [...serverMessages];
      const cachedMap = new Map(cachedMessages.map(m => [m.id, m]));
      
      for (const cachedMsg of cachedMessages) {
        if (!mergedMessages.find(m => m.id === cachedMsg.id)) {
          mergedMessages.push(cachedMsg);
        }
      }
      
      convo.messages = mergedMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      await saveMessagesToCache(convo.id, convo.messages);
    }
    
    // Save merged conversations
    await saveToCache(mergedConversations);
    return mergedConversations;
  }, [loadFromCache, loadMessagesFromCache, saveToCache, saveMessagesToCache]);

  // Queue action for offline sync (simple FIFO queue)
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const queueAction = useCallback((action: any) => {
    setOfflineQueue(prev => [...prev, { ...action, timestamp: Date.now() }]);
  }, []);

  const processQueue = useCallback(async () => {
    if (!navigator.onLine || offlineQueue.length === 0) return;
    
    const action = offlineQueue[0];
    try {
      // Simulate sync (in real app, call API and update cache)
      console.log("Syncing offline action:", action.type);
      
      // Remove from queue after success
      setOfflineQueue(prev => prev.slice(1));
    } catch (error) {
      console.error("Offline sync failed:", error);
      // Retry later (e.g., re-queue)
    }
  }, [offlineQueue]);

  // Listen for online status
  useEffect(() => {
    const handleOnline = () => {
      processQueue();
    };
    
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [processQueue]);

  // Clear cache (e.g., on logout)
  const clearCache = useCallback(async () => {
    await cacheOperations.clear();
    setCacheStats({ count: 0 });
  }, []);

  return {
    isCacheReady,
    cacheStats,
    loadFromCache,
    saveToCache,
    loadMessagesFromCache,
    saveMessagesToCache,
    mergeWithCache,
    queueAction,
    clearCache
  };
};