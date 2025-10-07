import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { Conversation, Message } from "@/types/conversation";

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { sessionId, isAnonymous } = useAnonymousSession();

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      
      try {
        let query = supabase
          .from('conversations')
          .select(`
            id, 
            title, 
            created_at, 
            updated_at,
            messages (id, role, content, created_at)
          `)
          .order('updated_at', { ascending: false });
        
        // Filter by user or session
        if (user?.id) {
          query = query.eq('user_id', user.id);
        } else if (sessionId && isAnonymous) {
          query = query.eq('session_id', sessionId);
        } else {
          // No user or session, don't load conversations
          setConversations([]);
          setLoading(false);
          return;
        }
        
        const { data, error } = await query;
        
        if (!error && data) {
          const sortedConversations = data.map((conv: any) => ({
            ...conv,
            messages: conv.messages ? conv.messages.sort((a: any, b: any) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ) : []
          }));
          
          setConversations(sortedConversations);
          
          // Set current conversation if we don't have one yet
          if (!currentConversation && sortedConversations.length > 0) {
            setCurrentConversation(sortedConversations[0]);
          }
        }
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user || (sessionId && isAnonymous)) {
      loadConversations();
    } else {
      setLoading(false);
    }
  }, [user, sessionId, isAnonymous]);

  // Create a new conversation
  const createConversation = async (title: string) => {
    try {
      // Prepare conversation data
      const conversationData: any = {
        title
      };
      
      // Add user or session info
      if (user?.id) {
        conversationData.user_id = user.id;
      } else if (sessionId && isAnonymous) {
        conversationData.session_id = sessionId;
      } else {
        throw new Error("No user or session available");
      }
      
      const { data, error } = await supabase
        .from('conversations')
        .insert([conversationData])
        .select(`
          id, 
          title, 
          created_at, 
          updated_at,
          messages (id, role, content, created_at)
        `)
        .single();
      
      if (!error && data) {
        const newConversation = { ...data, messages: [] };
        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversation(newConversation);
        return newConversation;
      } else if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      throw error;
    }
    
    return null;
  };

  // Add a message to a conversation
  const addMessage = async (conversationId: string, role: "user" | "assistant", content: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ conversation_id: conversationId, role, content }])
        .select()
        .single();
      
      if (!error && data) {
        // Update the conversation in state immediately
        setConversations(prev => 
          prev.map(conv => {
            if (conv.id === conversationId) {
              const updatedMessages = [...conv.messages, data];
              return { 
                ...conv, 
                messages: updatedMessages,
                updated_at: new Date().toISOString()
              };
            }
            return conv;
          })
        );
        
        // Update current conversation if it's the one we're adding to
        if (currentConversation && currentConversation.id === conversationId) {
          setCurrentConversation(prev => {
            if (!prev) return prev;
            const updatedMessages = [...prev.messages, data];
            return {
              ...prev,
              messages: updatedMessages,
              updated_at: new Date().toISOString()
            };
          });
        }
        
        return data;
      } else if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error("Error adding message:", error);
      throw error;
    }
    
    return null;
  };

  // Update conversation title
  const updateConversationTitle = async (conversationId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      if (error) throw error;
      
      // Update in state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title, updated_at: new Date().toISOString() } 
            : conv
        )
      );
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => 
          prev ? { ...prev, title, updated_at: new Date().toISOString() } : null
        );
      }
    } catch (error: any) {
      console.error("Error updating conversation title:", error);
      throw error;
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      
      if (error) throw error;
      
      // Remove from state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If we're deleting the current conversation, set to null
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
      }
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      throw error;
    }
  };

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    loading,
    createConversation,
    addMessage,
    updateConversationTitle,
    deleteConversation
  };
};