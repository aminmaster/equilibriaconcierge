import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      
      try {
        // For anonymous users, we would use session ID
        // For authenticated users, we would use user ID
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            id, 
            title, 
            created_at, 
            updated_at,
            messages (id, role, content, created_at)
          `)
          .order('updated_at', { ascending: false });
        
        if (!error && data) {
          setConversations(data.map(conv => ({
            ...conv,
            messages: conv.messages ? conv.messages.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ) : []
          })));
        }
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadConversations();
  }, []);

  // Create a new conversation
  const createConversation = async (title: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ title }])
        .select()
        .single();
      
      if (!error && data) {
        const newConversation = { ...data, messages: [] };
        setConversations([newConversation, ...conversations]);
        setCurrentConversation(newConversation);
        return newConversation;
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
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
        // Update the conversation in state
        setConversations(convs => convs.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                messages: [...conv.messages, data],
                updated_at: new Date().toISOString()
              } 
            : conv
        ));
        
        // Update current conversation if it's the one we're adding to
        if (currentConversation && currentConversation.id === conversationId) {
          setCurrentConversation({
            ...currentConversation,
            messages: [...currentConversation.messages, data],
            updated_at: new Date().toISOString()
          });
        }
        
        return data;
      }
    } catch (error) {
      console.error("Error adding message:", error);
    }
    
    return null;
  };

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    loading,
    createConversation,
    addMessage
  };
};