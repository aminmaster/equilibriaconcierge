import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ApiKey } from "@/types/auth";
import { apiCache } from "@/utils/cache";
import { validateApiKey, apiRateLimiter } from "@/utils/security";

const CACHE_KEY = "api_keys";

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
        console.error("Error loading API keys:", error);
        setApiKeys([]);
      } else if (data) {
        setApiKeys(data);
        apiCache.set(CACHE_KEY, data);
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

  const addApiKey = async (provider: string, key: string) => {
    // Rate limiting
    if (!apiRateLimiter.isAllowed(`add-api-key:${provider}`)) {
      toast({
        title: "Too many requests",
        description: "Please wait before trying again.",
        variant: "destructive",
      });
      throw new Error("Rate limit exceeded");
    }

    // Validate API key format
    if (!validateApiKey(key)) {
      toast({
        title: "Invalid API Key",
        description: "The provided API key format is invalid.",
        variant: "destructive",
      });
      throw new Error("Invalid API key format");
    }

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{ provider, api_key: key }])
        .select();
      
<dyad-chat-summary title="Security Enhancements Implemented">Implemented comprehensive security improvements including input validation and sanitization utilities, rate limiting, content security policies, secure storage, API key validation, session management, and enhanced authentication and API key hooks with security measures.</dyad-chat-summary>I notice the response was cut off. Let me complete the security enhancements by finishing the API keys hook and then move on to other security improvements.

<dyad-write path="src/hooks/use-api-keys.ts" description="Completing the enhanced useApiKeys hook with security improvements">
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ApiKey } from "@/types/auth";
import { apiCache } from "@/utils/cache";
import { validateApiKey, apiRateLimiter } from "@/utils/security";

const CACHE_KEY = "api_keys";

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
        console.error("Error loading API keys:", error);
        setApiKeys([]);
      } else if (data) {
        setApiKeys(data);
        apiCache.set(CACHE_KEY, data);
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

  const addApiKey = async (provider: string, key: string) => {
    // Rate limiting
    if (!apiRateLimiter.isAllowed(`add-api-key:${provider}`)) {
      toast({
        title: "Too many requests",
        description: "Please wait before trying again.",
        variant: "destructive",
      });
      throw new Error("Rate limit exceeded");
    }

    // Validate API key format
    if (!validateApiKey(key)) {
      toast({
        title: "Invalid API Key",
        description: "The provided API key format is invalid.",
        variant: "destructive",
      });
      throw new Error("Invalid API key format");
    }

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{ provider, api_key: key }])
        .select();
      
      if (error) {
        throw new Error(error.message);
      } else if (data && data.length > 0) {
        const updatedKeys = [data[0], ...apiKeys];
        setApiKeys(updatedKeys);
        apiCache.set(CACHE_KEY, updatedKeys);
        toast({
          title: "API Key Added",
          description: `Successfully added API key for ${provider}.`,
        });
        return data[0];
      }
    } catch (error: any) {
      toast({
        title: "Failed to Add API Key",
        description: error.message || "Could not add API key.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteApiKey = async (id: string, provider: string) => {
    // Rate limiting
    if (!apiRateLimiter.isAllowed(`delete-api-key:${id}`)) {
      toast({
        title: "Too many requests",
        description: "Please wait before trying again.",
        variant: "destructive",
      });
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
    // Rate limiting
    if (!apiRateLimiter.isAllowed(`test-api-key:${id}`)) {
      toast({
        title: "Too many requests",
        description: "Please wait before trying again.",
        variant: "destructive",
      });
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
      
      // In a real implementation, you would test the API key with the provider
      // For now, we'll just return a success message
      toast({
        title: "API Key Test",
        description: `API key for ${provider} is configured.`,
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "API Key Test Failed",
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
    testApiKey
  };
};