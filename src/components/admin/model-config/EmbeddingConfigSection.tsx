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
      console.log("Loading embedding model configurations");
      // Load embedding config
      const { data: embeddingData, error: embeddingError } = await supabase
        .from('model_configurations')
        .select('*')
        .eq('type', 'embedding')
        .single();
      
      console.log("Embedding config data:", embeddingData);
      console.log("Embedding config error:", embeddingError);
      
      if (!embeddingError && embeddingData) {
        const defaultModels = defaultEmbeddingModels[embeddingData.provider as keyof typeof defaultEmbeddingModels] || 
                             defaultEmbeddingModels.openai || [];
        const defaultModel = defaultModels[0] || { model: "text-embedding-3-large", dimensions: 3072 };
        
        const newConfig = {
          provider: embeddingData.provider || "openai",
          model: embeddingData.model || defaultModel.model,
          dimensions: embeddingData.dimensions || defaultModel.dimensions,
        };
        
        console.log("Setting embedding config:", newConfig);
        setEmbeddingConfig(newConfig);
        
        // Load models for the saved provider ONLY if providers are available
        if (embeddingData.provider && availableProviders.length > 0) {
          await loadEmbeddingModelsForProvider(embeddingData.provider);
        } else {
          // If no providers available, clear the models list
          setEmbeddingModels([]);
        }
      } else if (embeddingError) {
        console.log("No embedding config found, using defaults");
        // If no config and no providers, clear models
        if (availableProviders.length === 0) {
          setEmbeddingModels([]);
        }
      }
    } catch (error: any) {
      console.error("Error loading model configurations:", error);
    }
  };

  // Load embedding models when provider changes
  const loadEmbeddingModelsForProvider = async (provider: string) => {
    setLoadingEmbeddingModels(true);
    try {
      console.log("Loading embedding models for provider:", provider);
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
    console.log("Fetching OpenAI embedding models");
    // Get OpenAI API key from database
    const { data, error } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('provider', 'openai')
      .single();

    if (error) {
      console.log("OpenAI API key error:", error);
      setEmbeddingModels(defaultEmbeddingModels.openai || []);
      return;
    }
    if (!data) {
      console.log("No OpenAI API key found");
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
      console.log("OpenAI API response not ok");
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
      console.log("Setting OpenAI embedding models:", embeddingModels);
      setEmbeddingModels(embeddingModels);
      
      // Update the current config with the first model's dimensions if it matches
      const firstModel = embeddingModels[0];
      if (embeddingConfig.model === firstModel.model || 
          (embeddingConfig.model === "text-embedding-3-large" && firstModel.model.includes("text-embedding-3-large"))) {
        setEmbeddingConfig(prev => ({
          ...prev,
          dimensions: firstModel.dimensions
        }));
      }
    } else {
      console.log("No embedding models found, using defaults");
      setEmbeddingModels(defaultEmbeddingModels.openai || []);
    }
  };

  // Load configurations on component mount
  useEffect(() => {
    console.log("EmbeddingConfigSection mounted");
    console.log("Available providers:", availableProviders);
    console.log("Default embedding models:", defaultEmbeddingModels);
    loadModelConfigurations();
  }, [availableProviders]); // Re-run when availableProviders changes

  // Update embedding models when provider changes
  const handleEmbeddingProviderChange = (provider: string) => {
    console.log("Changing embedding provider to:", provider);
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

  console.log("Rendering EmbeddingConfigSection");
  console.log("Embedding config:", embeddingConfig);
  console.log("Embedding models:", embeddingModels);
  console.log("Available providers:", availableProviders);

  return (
    <div className="space-y-6">
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
                <SelectItem value="no-providers" disabled>
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
              {embeddingConfig.provider === "openai" && availableProviders.length > 0 && (
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
                {availableProviders.length > 0 && embeddingModels.length > 0 ? (
                  embeddingModels.map((model) => (
                    <SelectItem key={model.model} value={model.model}>
                      {model.model} ({model.dimensions} dimensions)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-models" disabled>
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
              value={embeddingConfig.dimensions || ""}
              onChange={(e) => setEmbeddingConfig({...embeddingConfig, dimensions: parseInt(e.target.value) || 0})}
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