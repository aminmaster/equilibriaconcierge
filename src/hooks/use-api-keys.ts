import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ApiKey } from "@/types/auth";
import { apiCache } from "@/utils/cache";

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

  useEffect(() => {
    loadApiKeys();
  }, []);

  return {
    apiKeys,
    loading,
    loadApiKeys,
    addApiKey,
    deleteApiKey,
    getApiKeyByProvider
  };
};