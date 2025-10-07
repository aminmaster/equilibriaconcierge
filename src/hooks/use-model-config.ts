import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModelConfigurations } from "@/types/models";
import { useToast } from "@/hooks/use-toast";
import { modelCache } from "@/utils/cache";
import { showApiError, showSuccess } from "@/utils/toast-utils";

const DEFAULT_GENERATION_CONFIG = {
  provider: "openrouter",
  model: "openai/gpt-4o",
  temperature: 0.7,
  maxTokens: 2048
};

const DEFAULT_EMBEDDING_CONFIG = {
  provider: "openai",
  model: "text-embedding-3-large",
  dimensions: 3072
};

const CACHE_KEY = "model_config";

export const useModelConfig = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<ModelConfigurations>({
    generation: DEFAULT_GENERATION_CONFIG,
    embedding: DEFAULT_EMBEDDING_CONFIG
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first
      const cachedConfig = modelCache.get(CACHE_KEY);
      if (cachedConfig) {
        setConfig(cachedConfig);
        setLoading(false);
        return;
      }
      
      const { data, error: fetchError } = await supabase
        .from('model_configurations')
        .select('*');
      
      if (fetchError) throw fetchError;
      
      if (!data || data.length === 0) {
        // Return defaults if no config found
        const defaultConfig = {
          generation: DEFAULT_GENERATION_CONFIG,
          embedding: DEFAULT_EMBEDDING_CONFIG
        };
        setConfig(defaultConfig);
        modelCache.set(CACHE_KEY, defaultConfig);
        return;
      }
      
      const newConfig: Partial<ModelConfigurations> = {};
      
      data.forEach((item: any) => {
        if (item.type === 'generation') {
          // Validate generation config
          if (typeof item.provider !== 'string' || item.provider.length === 0) {
            console.warn("Invalid generation provider, using default");
            item.provider = DEFAULT_GENERATION_CONFIG.provider;
          }
          
          if (typeof item.model !== 'string' || item.model.length === 0) {
            console.warn("Invalid generation model, using default");
            item.model = DEFAULT_GENERATION_CONFIG.model;
          }
          
          if (typeof item.temperature !== 'number' || item.temperature < 0 || item.temperature > 2) {
            console.warn("Invalid generation temperature, using default");
            item.temperature = DEFAULT_GENERATION_CONFIG.temperature;
          }
          
          if (typeof item.max_tokens !== 'number' || item.max_tokens < 1) {
            console.warn("Invalid generation max_tokens, using default");
            item.max_tokens = DEFAULT_GENERATION_CONFIG.maxTokens;
          }
          
          newConfig.generation = {
            provider: item.provider,
            model: item.model,
            temperature: item.temperature !== null ? item.temperature : 0.7,
            maxTokens: item.max_tokens || 2048
          };
        } else if (item.type === 'embedding') {
          // Validate embedding config
          if (typeof item.provider !== 'string' || item.provider.length === 0) {
            console.warn("Invalid embedding provider, using default");
            item.provider = DEFAULT_EMBEDDING_CONFIG.provider;
          }
          
          if (typeof item.model !== 'string' || item.model.length === 0) {
            console.warn("Invalid embedding model, using default");
            item.model = DEFAULT_EMBEDDING_CONFIG.model;
          }
          
          if (typeof item.dimensions !== 'number' || item.dimensions < 1) {
            console.warn("Invalid embedding dimensions, using default");
            item.dimensions = DEFAULT_EMBEDDING_CONFIG.dimensions;
          }
          
          newConfig.embedding = {
            provider: item.provider,
            model: item.model,
            dimensions: item.dimensions
          };
        }
      });
      
      // Fill in defaults for missing configs
      const finalConfig = {
        generation: newConfig.generation || DEFAULT_GENERATION_CONFIG,
        embedding: newConfig.embedding || DEFAULT_EMBEDDING_CONFIG
      };
      
      setConfig(finalConfig);
      modelCache.set(CACHE_KEY, finalConfig);
    } catch (err: any) {
      console.error("Error loading model config:", err);
      setError(err.message);
      // Use defaults on error
      const defaultConfig = {
        generation: DEFAULT_GENERATION_CONFIG,
        embedding: DEFAULT_EMBEDDING_CONFIG
      };
      setConfig(defaultConfig);
      modelCache.set(CACHE_KEY, defaultConfig);
      showApiError(err, "load model config");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: ModelConfigurations) => {
    try {
      // Validate the new config before saving
      if (!newConfig.generation.provider || typeof newConfig.generation.provider !== 'string') {
        throw new Error("Invalid generation provider");
      }
      
      if (!newConfig.generation.model || typeof newConfig.generation.model !== 'string') {
        throw new Error("Invalid generation model");
      }
      
      if (typeof newConfig.generation.temperature !== 'number' || 
          newConfig.generation.temperature < 0 || 
          newConfig.generation.temperature > 2) {
        throw new Error("Invalid generation temperature (must be between 0 and 2)");
      }
      
      if (typeof newConfig.generation.maxTokens !== 'number' || 
          newConfig.generation.maxTokens < 1) {
        throw new Error("Invalid max tokens (must be greater than 0)");
      }
      
      if (!newConfig.embedding.provider || typeof newConfig.embedding.provider !== 'string') {
        throw new Error("Invalid embedding provider");
      }
      
      if (!newConfig.embedding.model || typeof newConfig.embedding.model !== 'string') {
        throw new Error("Invalid embedding model");
      }
      
      if (typeof newConfig.embedding.dimensions !== 'number' || 
          newConfig.embedding.dimensions < 1) {
        throw new Error("Invalid embedding dimensions (must be greater than 0)");
      }
      
      // Delete existing configurations
      await supabase
        .from('model_configurations')
        .delete()
        .neq('id', 'never-match'); // This will delete all rows
      
      // Insert new generation config
      const generationPayload = {
        id: 'generation-default',
        type: 'generation',
        provider: newConfig.generation.provider,
        model: newConfig.generation.model,
        temperature: newConfig.generation.temperature,
        max_tokens: newConfig.generation.maxTokens,
        updated_at: new Date().toISOString()
      };
      
      const { error: generationError } = await supabase
        .from('model_configurations')
        .insert([generationPayload]);
      
      if (generationError) throw generationError;
      
      // Insert new embedding config
      const embeddingPayload = {
        id: 'embedding-default',
        type: 'embedding',
        provider: newConfig.embedding.provider,
        model: newConfig.embedding.model,
        dimensions: newConfig.embedding.dimensions,
        updated_at: new Date().toISOString()
      };
      
      const { error: embeddingError } = await supabase
        .from('model_configurations')
        .insert([embeddingPayload]);
      
      if (embeddingError) throw embeddingError;
      
      // Update local state and cache
      setConfig(newConfig);
      modelCache.set(CACHE_KEY, newConfig);
      
      showSuccess("Configuration Saved", "Model configuration has been updated successfully.");
      
      return true;
    } catch (err: any) {
      console.error("Error saving model config:", err);
      showApiError(err, "save model config");
      return false;
    }
  };

  const resetToDefaults = async () => {
    try {
      const defaultConfig = {
        generation: DEFAULT_GENERATION_CONFIG,
        embedding: DEFAULT_EMBEDDING_CONFIG
      };
      
      const success = await saveConfig(defaultConfig);
      if (success) {
        setConfig(defaultConfig);
        showSuccess("Configuration Reset", "Model configuration has been reset to defaults.");
      }
      return success;
    } catch (err: any) {
      console.error("Error resetting model config:", err);
      showApiError(err, "reset model config");
      return false;
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    loading,
    error,
    reloadConfig: loadConfig,
    saveConfig,
    resetToDefaults
  };
};