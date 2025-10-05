import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConversations } from "@/hooks/use-conversations";

export const useChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { currentConversation, addMessage, createConversation } = useConversations();

  const streamMessage = async (content: string, onChunk: (chunk: string) => void) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    
    try {
      // Create a new conversation if none exists
      let conversationId = currentConversation?.id;
      if (!conversationId) {
        const newConversation = await createConversation("New Conversation");
        if (!newConversation) {
          throw new Error("Failed to create conversation");
        }
        conversationId = newConversation.id;
      }
      
      // Add user message to conversation
      const userMessage = await addMessage(conversationId, "user", content);
      if (!userMessage) {
        throw new Error("Failed to add user message");
      }
      
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Call chat edge function with streaming
      const response = await fetch('https://jmxemujffofqpqrxajlb.supabase.co/functions/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          message: content,
          conversationId: conversationId
        })
      });
      
      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Add final AI response to conversation if we haven't added anything yet
            if (aiResponse.trim()) {
              await addMessage(conversationId, "assistant", aiResponse);
            }
            break;
          }
          
          const chunk = decoder.decode(value);
          // Parse SSE format if needed
          if (chunk.startsWith('data: ')) {
            const data = chunk.slice(6); // Remove 'data: ' prefix
            if (data === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                aiResponse += content;
                onChunk(content);
              }
            } catch (e) {
              // Handle non-JSON chunks
              aiResponse += data;
              onChunk(data);
            }
          } else {
            aiResponse += chunk;
            onChunk(chunk);
          }
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
    streamMessage,
    cancelStream,
    isLoading,
    error
  };
};