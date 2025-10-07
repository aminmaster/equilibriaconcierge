import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ApiKey } from "@/types/auth";

// Simple encryption/decryption functions (in a real app, this would be more secure)
const encryptKey = (key: string): string => {
  // In a production environment, you would use proper encryption
  // This is just a simple obfuscation for demonstration
  return btoa(key);
};

const decryptKey = (encryptedKey: string): string => {
  try {
    return atob(encryptedKey);
  } catch {
    return encryptedKey; // Return as-is if decryption fails
  }
};

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error loading API keys:", error);
        setApiKeys([]);
      } else if (data) {
        // Decrypt keys for display (only show last 4 characters for security)
        const decryptedKeys = data.map((key: any) => ({
          ...key,
          api_key: decryptKey(key.api_key)
        }));
        setApiKeys(decryptedKeys);
      }
    } catch (error: any) {
      console.error("Error loading API keys:", error);
      toast({
        title: "Failed to Load API Keys",
        description: error.message || "Could not fetch API keys.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateApiKey = async (provider: string, key: string): Promise<boolean> => {
    try {
      switch (provider) {
        case 'openai':
          const openaiResponse = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
            }
          });
          return openaiResponse.ok;
        
        case 'openrouter':
          const openrouterResponse = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
            }
          });
          return openrouterResponse.ok;
        
        case 'anthropic':
          // For Anthropic, we'll do a simple validation request
          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: "claude-3-haiku-20240307",
              max_tokens: 10,
              messages: [{
                role: "user",
                content: "Hello"
              }]
            })
          });
          // For Anthropic, a 400 error might still mean the key is valid (just bad request)
          return anthropicResponse.status !== 401 && anthropicResponse.status !== 403;
        
        default:
          // For other providers, assume valid
          return true;
      }
    } catch (error) {
      console.error(`Error validating ${provider} API key:`, error);
      return false;
    }
  };

  const addApiKey = async (provider: string, key: string) => {
    try {
      // Validate the API key first
      const isValid = await validateApiKey(provider, key);
      if (!isValid) {
        toast({
          title: "Invalid API Key",
          description: `The provided ${provider} API key is invalid or expired.`,
          variant: "destructive",
        });
        throw new Error("Invalid API key");
      }

      const { data, error } = await supabase
        .from('api_keys')
        .insert([{
          provider,
          api_key: encryptKey(key)
        }])
        .select();
      
      if (error) {
        throw new Error(error.message);
      } else if (data && data.length > 0) {
        // Decrypt for display
        const decryptedKey = {
          ...data[0],
          api_key: decryptKey(data[0].api_key)
        };
        setApiKeys([decryptedKey, ...apiKeys]);
        toast({
          title: "API Key Added",
          description: `Successfully added and validated API key for ${provider}.`,
        });
        return decryptedKey;
      }
    } catch (error: any) {
      if (error.message !== "Invalid API key") {
        toast({
          title: "Failed to Add API Key",
          description: error.message || "Could not add API key.",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const deleteApiKey = async (id: string, provider: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      } else {
        setApiKeys(apiKeys.filter(key => key.id !== id));
        toast({
          title: "API Key Deleted",
          description: `Successfully deleted API key for ${provider}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Delete API Key",
        description: error.message || "Could not delete API key.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getApiKeyByProvider = (provider: string) => {
    return apiKeys.find(key => key.provider === provider);
  };

  const testApiKey = async (id: string, provider: string) => {
    try {
      // Get the encrypted key from database
      const { data, error } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error("API key not found");
      
      // Decrypt the key
      const decryptedKey = decryptKey(data.api_key);
      
      // Validate the key
      const isValid = await validateApiKey(provider, decryptedKey);
      
      toast({
        title: isValid ? "API Key Valid" : "API Key Invalid",
        description: isValid 
          ? `The ${provider} API key is valid and working.` 
          : `The ${provider} API key is invalid or expired.`,
        variant: isValid ? "default" : "destructive",
      });
      
      return isValid;
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test API key.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  return {
    apiKeys,
    loading,
    loadApiKeys,
    addApiKey,
    deleteApiKey,
    getApiKeyByProvider,
    testApiKey,
    validateApiKey
  };
};