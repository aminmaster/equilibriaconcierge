import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConversations } from "@/hooks/use-conversations";
import { useToast } from "@/hooks/use-toast";
import { useModelConfig } from "@/hooks/use-model-config";

export const useChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { currentConversation, addMessage, createConversation } = useConversations();
  const { toast } = useToast();
  const { config: modelConfig, loading: configLoading } = useModelConfig();

  const streamMessage = async (content: string, onChunk: (chunk: string) => void) => {
    if (isLoading || configLoading) return;
    
    setIsLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    
    try {
      // Create a new conversation if none exists
      let conversationId = currentConversation?.id;
      if (!conversationId) {
        console.log("Creating new conversation");
        const newConversation = await createConversation("New Conversation");
        if (!newConversation) {
          throw new Error("Failed to create conversation");
        }
        conversationId = newConversation.id;
        console.log("Created conversation with ID:", conversationId);
      }
      
      // Add user message to conversation
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
      
      // Call chat edge function with streaming
      console.log("Calling chat function with conversation ID:", conversationId);
      console.log("Using model config:", modelConfig);
      
      const requestBody = {
        message: content,
        conversationId: conversationId,
        // Only pass generation parameters to the chat function
        generationProvider: modelConfig.generation.provider,
        generationModel: modelConfig.generation.model
      };
      
      console.log("Sending request body:", requestBody);
      
      const response = await fetch('https://jmxemujffofqpqrxajlb.supabase.co/functions/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log("Chat function response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Chat function error:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      if (!response.body) {
        throw new Error("Response body is null");
      }
      
      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";
      let buffer = "";
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Add final AI response to conversation if we haven't added anything yet
            if (aiResponse.trim() && conversationId) {
              console.log("Adding AI response to conversation");
              await addMessage(conversationId, "assistant", aiResponse);
            }
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6); // Remove 'data: ' prefix
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  aiResponse += content;
                  onChunk(content);
                }
              } catch (e) {
                // If it's not valid JSON, skip it
                console.warn("Failed to parse JSON:", data);
              }
            }
          }
        }
        
        // Process any remaining data in the buffer
        if (buffer.startsWith('data: ')) {
          const data = buffer.slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                aiResponse += content;
                onChunk(content);
              }
            } catch (e) {
              console.warn("Failed to parse remaining JSON:", data);
            }
          }
        }
      } catch (streamError: any) {
        if (streamError.name !== 'AbortError') {
          throw streamError;
        }
      }
      
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "Failed to send message");
      
      // Show toast notification for model configuration errors
      if (err.message?.includes("model configurations") || err.message?.includes("configure models")) {
        toast({
          title: "Model Configuration Required",
          description: "Please configure AI models in the admin panel before using the chat.",
          variant: "destructive" as const
        });
      }
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
    error,
    configLoading
  };
};