import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConversations } from "@/hooks/use-conversations";
import { callEdgeFunction, streamEdgeFunction } from "@/utils/api";

export const useChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { currentConversation, addMessage } = useConversations();

  const sendMessage = async (content: string) => {
    if (!currentConversation || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Add user message to conversation
      await addMessage(currentConversation.id, "user", content);
      
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Call chat edge function
      const response = await callEdgeFunction('chat', {
        message: content,
        conversationId: currentConversation.id
      }, token);
      
      if (!response.ok) {
        throw new Error(`Chat function error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Add AI response to conversation
      await addMessage(currentConversation.id, "assistant", data.response);
      
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const streamMessage = async (content: string, onChunk: (chunk: string) => void) => {
    if (!currentConversation || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    
    try {
      // Add user message to conversation
      await addMessage(currentConversation.id, "user", content);
      
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Call chat edge function with streaming
      const response = await streamEdgeFunction('chat', {
        message: content,
        conversationId: currentConversation.id
      }, token);
      
      if (!response) {
        throw new Error("No response from chat function");
      }
      
      // Process the stream
      const reader = response.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Add final AI response to conversation
            await addMessage(currentConversation.id, "assistant", aiResponse);
            break;
          }
          
          const chunk = decoder.decode(value);
          aiResponse += chunk;
          onChunk(chunk);
        }
      } catch (streamError: any) {
        if (streamError.name !== 'AbortError') {
          throw streamError;
        }
      }
      
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return {
    sendMessage,
    streamMessage,
    cancelStream,
    isLoading,
    error
  };
};