import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModelConfigurations } from "@/types/models";
import { useToast } from "@/hooks/use-toast";
import { modelCache } from "@/utils/cache";

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
  const [config, setConfig] = useState<ModelConfigurations>({
    generation: DEFAULT_GENERATION_CONFIG,
    embedding: DEFAULT_EMBEDDING_CONFIG
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
          newConfig.generation = {
            provider: item.provider,
            model: item.model,
            temperature: item.temperature !== null ? item.temperature : 0.7,
            maxTokens: item.max_tokens || 2048
          };
        } else if (item.type === 'embedding') {
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
      toast({
        title: "Configuration Error",
        description: "Using default model configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: ModelConfigurations) => {
    try {
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
      
      toast({
        title: "Configuration Saved",
        description: "Model configuration has been updated successfully.",
      });
      
      return true;
    } catch (err: any) {
      console.error("Error saving model config:", err);
      toast({
        title: "Failed to Save Configuration",
        description: err.message || "Could not save model configuration.",
        variant: "destructive",
      });
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
        toast({
          title: "Configuration Reset",
          description: "Model configuration has been reset to defaults.",
        });
      }
      return success;
    } catch (err: any) {
      console.error("Error resetting model config:", err);
      toast({
        title: "Failed to Reset Configuration",
        description: err.message || "Could not reset model configuration.",
        variant: "destructive",
      });
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