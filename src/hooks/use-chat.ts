import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConversations } from "@/hooks/use-conversations";
import { useToast } from "@/hooks/use-toast";
import { useModelConfig } from "@/hooks/use-model-config";
import { showApiError, showGenericError } from "@/utils/toast-utils";

interface UseChatReturn {
  streamMessage: (content: string, onChunk: (chunk: string) => void) => Promise<void>;
  cancelStream: () => void;
  isLoading: boolean;
  error: string | null;
  configLoading: boolean;
  messageBuffer: string[];
  clearBuffer: () => void;
}

export const useChat = (): UseChatReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { currentConversation, addMessage, createConversation } = useConversations();
  const { toast } = useToast();
  const { config: modelConfig, loading: configLoading } = useModelConfig();
  
  // Client-side cache for recent messages (to avoid redundant fetches)
  const recentMessagesCache = useRef<Map<string, string[]>>(new Map());
  const MAX_CACHE_SIZE = 50; // Limit cache to recent conversations

  // Memory buffer for streaming chunks
  const [messageBuffer, setMessageBuffer] = useState<string[]>([]);
  const MAX_BUFFER_SIZE = 100;

  // Clean up on unmount or error
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear cache on unmount to free memory
      recentMessagesCache.current.clear();
    };
  }, []);

  const streamMessage = useCallback(async (content: string, onChunk: (chunk: string) => void) => {
    if (isLoading || configLoading) {
      toast({
        title: "Chat Unavailable",
        description: "Please wait for the system to be ready.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    
    try {
      // Create a new conversation if none exists
      let conversationId = currentConversation?.id;
      if (!conversationId) {
        console.log("Creating new conversation for chat");
        const newConversation = await createConversation("New Conversation");
        if (!newConversation) {
          throw new Error("Failed to create conversation");
        }
        conversationId = newConversation.id;
        console.log("Created conversation with ID:", conversationId);
      }
      
      // Add user message to conversation (optimistic update)
      console.log("Adding user message to conversation:", conversationId);
      if (conversationId) {
        const userMessage = await addMessage(conversationId, "user", content);
        if (!userMessage) {
          throw new Error("Failed to add user message");
        }
        console.log("Added user message:", userMessage);
      }
      
      // Get session token (optional - for authenticated users)
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      console.log("Auth token present:", !!token);
      
      // Prepare request body with model config
      const requestBody = {
        message: content,
        conversationId: conversationId,
        generationProvider: modelConfig.generation.provider,
        generationModel: modelConfig.generation.model,
      };
      
      console.log("Sending request body:", requestBody);
      
      // Call chat edge function with streaming
      const response = await fetch('https://jmxemujffofqpqrxajlb.supabase.co/functions/v1/chat', {
        method: 'POST',
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log("Chat function response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Chat function error:", errorText);
        
        // Handle specific error cases with retry logic
        if (response.status === 401) {
          throw new Error("Authentication required. Please sign in to continue.");
        } else if (response.status === 403) {
          throw new Error("Access denied. You don't have permission to perform this action.");
        } else if (response.status === 404) {
          throw new Error("Conversation not found. Please try again.");
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait before trying again.");
        } else {
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
      }
      
      if (!response.body) {
        throw new Error("Response body is null");
      }
      
      // Process the stream with improved buffer management
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";
      let buffer = "";
      let retryCount = 0;
      const MAX_RETRIES = 3;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Finalize AI response
            if (aiResponse.trim() && conversationId) {
              console.log("Finalizing AI response to conversation");
              await addMessage(conversationId, "assistant", aiResponse);
            }
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  aiResponse += content;
                  
                  // Efficient buffer management
                  setMessageBuffer(prev => {
                    const newBuffer = [...prev, content];
                    if (newBuffer.length > MAX_BUFFER_SIZE) {
                      return newBuffer.slice(-MAX_BUFFER_SIZE);
                    }
                    return newBuffer;
                  });
                  
                  onChunk(content);
                }
              } catch (parseError) {
                console.warn("Failed to parse JSON chunk:", data);
                // Retry parsing on next chunk if buffer is incomplete
                retryCount++;
                if (retryCount > 5) {
                  console.error("Too many parse errors, aborting stream");
                  throw new Error("Stream parsing failed after multiple attempts");
                }
              }
            }
          }
        }
        
        // Process remaining buffer
        if (buffer.startsWith('data: ')) {
          const data = buffer.slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                aiResponse += content;
                
                setMessageBuffer(prev => {
                  const newBuffer = [...prev, content];
                  if (newBuffer.length > MAX_BUFFER_SIZE) {
                    return newBuffer.slice(-MAX_BUFFER_SIZE);
                  }
                  return newBuffer;
                });
                
                onChunk(content);
              }
            } catch (parseError) {
              console.warn("Failed to parse final buffer:", data);
            }
          }
        }
      } catch (streamError: any) {
        if (streamError.name !== 'AbortError') {
          // Retry logic for recoverable errors (e.g., network hiccup)
          if (retryCount < MAX_RETRIES && (streamError.name === 'NetworkError' || streamError.message.includes('fetch'))) {
            retryCount++;
            console.log(`Stream error (attempt ${retryCount}/${MAX_RETRIES}):`, streamError.message);
            // Re-throw to trigger retry in calling code if needed
            throw streamError;
          }
          throw streamError;
        }
      }
      
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "Failed to send message");
      
      // Enhanced error categorization
      if (err.message?.includes("model configurations") || err.message?.includes("configure models")) {
        showGenericError("Model Configuration Required", "Please configure AI models in the admin panel before using the chat.");
      } else if (err.message?.includes("Authentication required")) {
        showGenericError("Authentication Required", "Please sign in to continue using the chat feature.");
      } else if (err.message?.includes("Rate limit")) {
        showGenericError("Rate Limit Exceeded", "Please wait a moment before sending another message.");
      } else {
        showApiError(err, "send message");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, configLoading, currentConversation, addMessage, createConversation, modelConfig]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // Clear buffer on cancel to free memory
      setMessageBuffer([]);
    }
  }, []);

  // Clear message buffer (for memory cleanup)
  const clearBuffer = useCallback(() => {
    setMessageBuffer([]);
  }, []);

  return {
    streamMessage,
    cancelStream,
    isLoading,
    error,
    configLoading,
    messageBuffer,
    clearBuffer
  };
};