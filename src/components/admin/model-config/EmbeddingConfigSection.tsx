"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EmbeddingConfigSectionProps {
  availableProviders: string[];
  loadingProviders: boolean;
  defaultEmbeddingModels: Record<string, Array<{model: string, dimensions: number}>>;
}

export function EmbeddingConfigSection({ 
  availableProviders, 
  loadingProviders,
  defaultEmbeddingModels
}: EmbeddingConfigSectionProps) {
  // Embedding config
  const [embeddingConfig, setEmbeddingConfig] = useState({
    provider: "openai",
    model: "text-embedding-3-large",
    dimensions: 3072,
  });
  
  const [embeddingModels, setEmbeddingModels] = useState<Array<{model: string, dimensions: number}>>(
    defaultEmbeddingModels.openai || []
  );
  const [loadingEmbeddingModels, setLoadingEmbeddingModels] = useState(false);
  const { toast } = useToast();

  // Load model configurations from database
  const loadModelConfigurations = async () => {
    try {
      // Load embedding config
      const { data: embeddingData, error: embeddingError } = await supabase
        .from('model_configurations')
        .select('*')
        .eq('type', 'embedding')
        .single();
      
      if (!embeddingError && embeddingData) {
        const defaultModels = defaultEmbeddingModels[embeddingData.provider as keyof typeof defaultEmbeddingModels] || 
                             defaultEmbeddingModels.openai || [];
        const defaultModel = defaultModels[0] || { model: "text-embedding-3-large", dimensions: 3072 };
        
        const newConfig = {
          provider: embeddingData.provider || "openai",
          model: embeddingData.model || defaultModel.model,
          dimensions: embeddingData.dimensions || defaultModel.dimensions,
        };
        
        setEmbeddingConfig(newConfig);
        
        // Load models for the saved provider
        if (embeddingData.provider) {
          await loadEmbeddingModelsForProvider(embeddingData.provider);
        }
      } else if (embeddingError) {
        console.log("No embedding config found, using defaults");
      }
    } catch (error: any) {
      console.error("Error loading model configurations:", error);
    }
  };

  // Load embedding models when provider changes
  const loadEmbeddingModelsForProvider = async (provider: string) => {
    setLoadingEmbeddingModels(true);
    try {
      if (provider === "openai") {
        await fetchOpenAIEmbeddingModels();
      } else if (provider === "openrouter") {
        setEmbeddingModels(defaultEmbeddingModels.openrouter || []);
      } else {
        setEmbeddingModels(
          defaultEmbeddingModels[provider as keyof typeof defaultEmbeddingModels] || 
          defaultEmbeddingModels.openai || []
        );
      }
    } catch (error: any) {
      console.error(`Error loading embedding models for ${provider}:`, error);
      setEmbeddingModels(
        defaultEmbeddingModels[provider as keyof typeof defaultEmbeddingModels] || 
        defaultEmbeddingModels.openai || []
      );
    } finally {
      setLoadingEmbeddingModels(false);
    }
  };

  const fetchOpenAIEmbeddingModels = async () => {
    // Get OpenAI API key from database
    const { data, error } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('provider', 'openai')
      .single();

    if (error) {
      setEmbeddingModels(defaultEmbeddingModels.openai || []);
      return;
    }
    if (!data) {
      setEmbeddingModels(defaultEmbeddingModels.openai || []);
      return;
    }

    // Fetch models from OpenAI API
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${data.api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      setEmbeddingModels(defaultEmbeddingModels.openai || []);
      return;
    }

    const result = await response.json();
    
    // Filter for embedding models
    const embeddingModels = result.data
      .filter((model: any) => model.id.includes('embedding'))
      .map((model: any) => {
        let dimensions = 1536;
        if (model.id === "text-embedding-3-large") {
          dimensions = 3072;
        } else if (model.id === "text-embedding-3-small") {
          dimensions = 1536;
        } else if (model.id === "text-embedding-ada-002") {
          dimensions = 1536;
        }
        return { model: model.id, dimensions };
      })
      .sort((a, b) => a.model.localeCompare(b.model));
    
    if (embeddingModels.length > 0) {
      setEmbeddingModels(embeddingModels);
    } else {
      setEmbeddingModels(defaultEmbeddingModels.openai || []);
    }
  };

  // Load configurations on component mount
  useEffect(() => {
    loadModelConfigurations();
  }, []);

  // Update embedding models when provider changes
  const handleEmbeddingProviderChange = (provider: string) => {
    const defaultModels = defaultEmbeddingModels[provider as keyof typeof defaultEmbeddingModels] || 
                         defaultEmbeddingModels.openai || [];
    const defaultModel = defaultModels[0] || { model: "text-embedding-3-large", dimensions: 3072 };
    
    setEmbeddingConfig(prev => ({
      ...prev,
      provider: provider,
      model: defaultModel.model,
      dimensions: defaultModel.dimensions
    }));
    
    // Load models for the new provider
    loadEmbeddingModelsForProvider(provider);
  };

  // Update embedding model and dimensions
  const handleEmbeddingModelChange = (model: string) => {
    const selectedModel = embeddingModels.find(m => m.model === model);
    if (selectedModel) {
      setEmbeddingConfig(prev => ({
        ...prev,
        model: selectedModel.model,
        dimensions: selectedModel.dimensions
      }));
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Embedding Provider</Label>
          <Select 
            value={embeddingConfig.provider} 
            onValueChange={handleEmbeddingProviderChange}
            disabled={loadingProviders}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select embedding provider" />
            </SelectTrigger>
            <SelectContent>
              {availableProviders.length > 0 ? (
                availableProviders.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="" disabled>
                  No providers available - add API keys first
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Provider used for creating document embeddings
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Embedding Model</Label>
              {embeddingConfig.provider === "openai" && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => loadEmbeddingModelsForProvider(embeddingConfig.provider)}
                  disabled={loadingEmbeddingModels || loadingProviders || availableProviders.length === 0}
                >
                  {loadingEmbeddingModels ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              )}
            </div>
            <Select 
              value={embeddingConfig.model} 
              onValueChange={handleEmbeddingModelChange}
              disabled={loadingEmbeddingModels || loadingProviders || availableProviders.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select embedding model" />
              </SelectTrigger>
              <SelectContent>
                {embeddingModels.length > 0 ? (
                  embeddingModels.map((model) => (
                    <SelectItem key={model.model} value={model.model}>
                      {model.model} ({model.dimensions} dimensions)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    {availableProviders.length > 0 
                      ? "No models available for this provider" 
                      : "Add API keys to see models"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Model used for creating document embeddings
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Dimensions</Label>
            <Input
              type="number"
              value={embeddingConfig.dimensions}
              onChange={(e) => setEmbeddingConfig({...embeddingConfig, dimensions: parseInt(e.target.value) || 1536})}
              disabled
            />
            <p className="text-sm text-muted-foreground">
              Vector dimensions for embeddings (auto-detected)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}