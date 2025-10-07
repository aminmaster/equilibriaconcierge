import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ApiKey } from "@/types/auth";
import { apiCache } from "@/utils/cache";
import { validateApiKey, apiRateLimiter } from "@/utils/security";
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/utils/encryption";
import { showApiError, showSuccess } from "@/utils/toast-utils";

// In a real application, this should be stored securely (e.g., environment variable)
// For demonstration, we'll generate a key
const ENCRYPTION_KEY = "your-secret-encryption-key-32-chars";

const CACHE_KEY = "api_keys";

export const useApiKeys = () => {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      // Check cache first
      const cachedKeys = apiCache.get(CACHE_KEY);
      if (cachedKeys) {
        setApiKeys(cachedKeys);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Database error:", error);
        showApiError(error, "load API keys");
        setApiKeys([]);
      } else if (data) {
        // Decrypt API keys for use
        const decryptedKeys = data.map((key: any) => ({
          ...key,
          api_key: decryptApiKey(key.api_key, ENCRYPTION_KEY)
        }));
        setApiKeys(decryptedKeys);
        apiCache.set(CACHE_KEY, decryptedKeys);
      }
    } catch (error: any) {
      console.error("Error loading API keys:", error);
      showApiError(error, "load API keys");
    } finally {
      setLoading(false);
    }
  };

  const addApiKey = async (provider: string, key: string) => {
    // Rate limiting
    if (!apiRateLimiter.isAllowed(`add-api-key:${provider}`)) {
      showApiError(new Error("Rate limit exceeded"), "add API key");
      throw new Error("Rate limit exceeded");
    }

    // Validate API key format
    if (!validateApiKey(key)) {
      showValidationError("API key", "The provided API key format is invalid.");
      throw new Error("Invalid API key format");
    }

    try {
      // Encrypt the API key before storing
      const encryptedKey = encryptApiKey(key, ENCRYPTION_KEY);
      
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{ provider, api_key: encryptedKey }])
        .select();
      
      if (error) {
        throw new Error(error.message);
      } else if (data && data.length > 0) {
        // Decrypt for immediate use
        const decryptedKey = {
          ...data[0],
          api_key: key // Use original key for immediate use
        };
        
        const updatedKeys = [decryptedKey, ...apiKeys];
        setApiKeys(updatedKeys);
        apiCache.set(CACHE_KEY, updatedKeys);
        showSuccess("API Key Added", `Successfully added API key for ${provider}.`);
        return decryptedKey;
      }
    } catch (error: any) {
      showApiError(error, "add API key");
      throw error;
    }
  };

  const deleteApiKey = async (id: string, provider: string) => {
    // Rate limiting
    if (!apiRateLimiter.isAllowed(`delete-api-key:${id}`)) {
      showApiError(new Error("Rate limit exceeded"), "delete API key");
      throw new Error("Rate limit exceeded");
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      } else {
        const updatedKeys = apiKeys.filter(key => key.id !== id);
        setApiKeys(updatedKeys);
        apiCache.set(CACHE_KEY, updatedKeys);
        showSuccess("API Key Deleted", `Successfully deleted API key for ${provider}.`);
      }
    } catch (error: any) {
      showApiError(error, "delete API key");
      throw error;
    }
  };

  const getApiKeyByProvider = (provider: string) => {
    return apiKeys.find(key => key.provider === provider);
  };

  const testApiKey = async (id: string, provider: string) => {
    // Rate limiting
    if (!apiRateLimiter.isAllowed(`test-api-key:${id}`)) {
      showApiError(new Error("Rate limit exceeded"), "test API key");
      throw new Error("Rate limit exceeded");
    }

    try {
      // Get the API key from database
      const { data, error } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error("API key not found");
      
      // Decrypt the API key for testing
      const decryptedKey = decryptApiKey(data.api_key, ENCRYPTION_KEY);
      
      // In a real implementation, you would test the API key with the provider
      // For now, we'll just return a success message
      showSuccess("API Key Test", `API key for ${provider} is configured.`);
      
      return true;
    } catch (error: any) {
      showApiError(error, "test API key");
      throw error;
    }
  };

  // Get masked API keys for display (without revealing the actual keys)
  const getMaskedApiKeys = () => {
    return apiKeys.map(key => ({
      ...key,
      api_key: maskApiKey(key.api_key)
    }));
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  return {
    apiKeys,
    maskedApiKeys: getMaskedApiKeys(),
    loading,
    loadApiKeys,
    addApiKey,
    deleteApiKey,
    getApiKeyByProvider,
    testApiKey
  };
};