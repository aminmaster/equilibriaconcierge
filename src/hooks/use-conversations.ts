import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { Conversation, Message } from "@/types/conversation";
import { apiCache } from "@/utils/cache";
import { useConversationCache } from "./use-conversation-cache"; // New import

const CONVERSATIONS_CACHE_KEY = "conversations";
const MESSAGES_PER_PAGE = 20;

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();
  const { sessionId, isAnonymous } = useAnonymousSession();
  const {
    isCacheReady,
    loadFromCache,
    saveToCache,
    loadMessagesFromCache,
    saveMessagesToCache,
    mergeWithCache,
    queueAction,
    clearCache
  } = useConversationCache(); // Integrate cache

  // Load conversations with pagination and caching
  const loadConversations = useCallback(async (page: number = 1) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      let query = supabase
        .from('conversations')
        .select(`
          id, 
          title, 
          created_at, 
          updated_at
        `)
        .order('updated_at', { ascending: false })
        .range((page - 1) * MESSAGES_PER_PAGE, page * MESSAGES_PER_PAGE - 1);
      
      // Filter by user or session
      if (user?.id) {
        query = query.eq('user_id', user.id);
      } else if (sessionId && isAnonymous) {
        query = query.eq('session_id', sessionId);
      } else {
        // No user or session, don't load conversations
        if (page === 1) {
          setConversations([]);
          apiCache.set(CONVERSATIONS_CACHE_KEY, []);
        }
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      
      const { data: serverConversations, error } = await query;
      
      if (error) {
        console.error("Error loading conversations:", error);
        if (page === 1) {
          // Fallback to cache on server error
          const cached = await loadFromCache();
          setConversations(cached || []);
          apiCache.set(CONVERSATIONS_CACHE_KEY, cached || []);
        }
      } else if (serverConversations) {
        // Load messages for each conversation from server (or cache if available)
        const serverMessagesMap = new Map<string, Message[]>();
        for (const convo of serverConversations) {
          const cachedMessages = await loadMessagesFromCache(convo.id);
          const serverMessages = await loadMessages(convo.id); // Fetch from server
          
          // Merge: server overrides cache
          const mergedMessages = [...serverMessages];
          const cachedMap = new Map(cachedMessages.map(m => [m.id, m]));
          
          for (const cachedMsg of cachedMessages) {
            if (!mergedMessages.find(m => m.id === cachedMsg.id)) {
              mergedMessages.push(cachedMsg);
            }
          }
          
          serverMessagesMap.set(convo.id, mergedMessages);
          await saveMessagesToCache(convo.id, mergedMessages);
        }
        
        // Merge conversations with messages
        const mergedConversations = await mergeWithCache(serverConversations, serverMessagesMap);
        
        if (page === 1) {
          setConversations(mergedConversations);
          apiCache.set(CONVERSATIONS_CACHE_KEY, mergedConversations);
          // Set current conversation if we don't have one yet
          if (!currentConversation && mergedConversations.length > 0) {
            setCurrentConversation({...mergedConversations[0], messages: serverMessagesMap.get(mergedConversations[0].id) || []});
          }
        } else {
          setConversations(prev => [...prev, ...mergedConversations]);
        }
        
        // Check if we have more data
        setHasMore(serverConversations.length === MESSAGES_PER_PAGE);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      if (page === 1) {
        // Fallback to cache on error
        const cached = await loadFromCache();
        setConversations(cached || []);
        apiCache.set(CONVERSATIONS_CACHE_KEY, cached || []);
      }
    } finally {
      if (page === 1) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [user?.id, sessionId, isAnonymous, currentConversation, loadFromCache, saveMessagesToCache, mergeWithCache]);

  // ... (rest of the hook remains the same, but update addMessage, updateConversationTitle, etc., to save to cache after server ops)

  // Example: Update addMessage to cache after server insert
  const addMessage = useCallback(async (conversationId: string, role: "user" | "assistant", content: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ conversation_id: conversationId, role, content }])
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      } else if (data) {
        // Update server-side state (as before)
        setConversations(prev => 
          prev.map(conv => {
            if (conv.id === conversationId) {
              return { 
                ...conv, 
                updated_at: new Date().toISOString()
              };
            }
            return conv;
          })
        );
        
        if (currentConversation && currentConversation.id === conversationId) {
          setCurrentConversation(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              updated_at: new Date().toISOString()
            };
          });
        }
        
        // Cache the new message
        const cachedMessages = await loadMessagesFromCache(conversationId);
        const updatedMessages = [...(cachedMessages || []), data];
        await saveMessagesToCache(conversationId, updatedMessages);
        
        return data;
      }
    } catch (error: any) {
      console.error("Error adding message:", error);
      // Queue for offline sync
      queueAction({ type: "addMessage", conversationId, role, content, timestamp: Date.now() });
      throw error;
    }
    
    return null;
  }, [currentConversation, loadMessagesFromCache, saveMessagesToCache, queueAction]);

  // Clear cache on auth change (e.g., logout)
  useEffect(() => {
    if (!user && !sessionId) {
      clearCache();
    }
  }, [user, sessionId, clearCache]);

  // ... (other functions like createConversation, deleteConversation remain similar, with cache saves after server ops)

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    loading,
    loadingMore,
    hasMore,
    loadMoreConversations,
    createConversation,
    loadMessages,
    addMessage,
    updateConversationTitle,
    deleteConversation,
    branchConversation,
    editMessage,
    exportConversation,
    // Expose cache methods if needed
    clearCache
  };
};