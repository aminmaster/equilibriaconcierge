import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModelConfigurations } from "@/types/models";
import { useToast } from "@/hooks/use-toast";

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
      const { data, error: fetchError } = await supabase
        .from('model_configurations')
        .select('*');
      
      if (fetchError) throw fetchError;
      
      if (!data || data.length === 0) {
        // Return defaults if no config found
        setConfig({
          generation: DEFAULT_GENERATION_CONFIG,
          embedding: DEFAULT_EMBEDDING_CONFIG
        });
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
      setConfig({
        generation: newConfig.generation || DEFAULT_GENERATION_CONFIG,
        embedding: newConfig.embedding || DEFAULT_EMBEDDING_CONFIG
      });
    } catch (err: any) {
      console.error("Error loading model config:", err);
      setError(err.message);
      // Use defaults on error
      setConfig({
        generation: DEFAULT_GENERATION_CONFIG,
        embedding: DEFAULT_EMBEDDING_CONFIG
      });
      toast({
        title: "Configuration Error",
        description: "Using default model configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    loading,
    error,
    reloadConfig: loadConfig
  };
};