"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Settings, 
  Save, 
  RotateCcw,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Define default models for each provider (fallback when API fetching isn't possible)
const DEFAULT_PROVIDER_MODELS = {
  openrouter: [
    "openai/gpt-4o",
    "openai/gpt-4-turbo",
    "openai/gpt-3.5-turbo",
    "anthropic/claude-3-opus",
    "anthropic/claude-3-sonnet",
    "google/gemini-pro"
  ],
  openai: [
    "gpt-4o",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo"
  ],
  anthropic: [
    "claude-3-5-sonnet-20240620",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307"
  ]
};

// Define default embedding models
const DEFAULT_EMBEDDING_MODELS = {
  openai: [
    "text-embedding-3-large",
    "text-embedding-3-small",
    "text-embedding-ada-002"
  ],
  openrouter: [
    "openai/text-embedding-3-large",
    "openai/text-embedding-3-small",
    "openai/text-embedding-ada-002"
  ]
};

export function ModelConfigTab() {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    embeddingProvider: "openai",
    embeddingModel: "text-embedding-3-large",
    generationProvider: "openrouter",
    generationModel: "openai/gpt-4o",
    temperature: 0.7,
    maxTokens: 2048,
  });
  const [availableProviders, setAvailableProviders] = useState<string[]>(["openrouter"]);
  const [generationModels, setGenerationModels] = useState<string[]>(
    DEFAULT_PROVIDER_MODELS.openrouter
  );
  const [embeddingModels, setEmbeddingModels] = useState<string[]>(
    DEFAULT_EMBEDDING_MODELS.openai
  );
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingGenerationModels, setLoadingGenerationModels] = useState(false);
  const [loadingEmbeddingModels, setLoadingEmbeddingModels] = useState(false);

  // Load available providers based on saved API keys
  useEffect(() => {
    loadAvailableProviders();
  }, []);

  // Load generation models when provider changes
  useEffect(() => {
    loadGenerationModelsForProvider(config.generationProvider);
  }, [config.generationProvider]);

  // Load embedding models when provider changes
  useEffect(() => {
    loadEmbeddingModelsForProvider(config.embeddingProvider);
  }, [config.embeddingProvider]);

  const loadAvailableProviders = async () => {
    setLoadingProviders(true);
    try {
      // Get all API keys from database
      const { data, error } = await supabase
        .from('api_keys')
        .select('provider');
      
      if (error) throw error;
      
      // Extract unique providers
      const providers = [...new Set(data.map((key: any) => key.provider))];
      setAvailableProviders(providers);
      
      // If current providers are not available, reset to first available
      if (providers.length > 0) {
        if (!providers.includes(config.generationProvider)) {
          setConfig(prev => ({
            ...prev,
            generationProvider: providers[0],
            generationModel: DEFAULT_PROVIDER_MODELS[providers[0] as keyof typeof DEFAULT_PROVIDER_MODELS]?.[0] || ""
          }));
        }
        
        if (!providers.includes(config.embeddingProvider)) {
          setConfig(prev => ({
            ...prev,
            embeddingProvider: providers[0],
            embeddingModel: DEFAULT_EMBEDDING_MODELS[providers[0] as keyof typeof DEFAULT_EMBEDDING_MODELS]?.[0] || 
                           DEFAULT_EMBEDDING_MODELS.openai?.[0] || ""
          }));
        }
      }
    } catch (error: any) {
      console.error("Error loading providers:", error);
      toast({
        title: "Failed to Load Providers",
        description: error.message || "Could not load available providers.",
        variant: "destructive",
      });
    } finally {
      setLoadingProviders(false);
    }
  };

  const loadGenerationModelsForProvider = async (provider: string) => {
    setLoadingGenerationModels(true);
    try {
      if (provider === "openai") {
        await fetchOpenAIModels();
      } else if (provider === "openrouter") {
        await fetchOpenRouterModels();
      } else {
        // For other providers, use default models
        setGenerationModels(
          DEFAULT_PROVIDER_MODELS[provider as keyof typeof DEFAULT_PROVIDER_MODELS] || 
          DEFAULT_PROVIDER_MODELS.openrouter
        );
      }
    } catch (error: any) {
      console.error(`Error loading generation models for ${provider}:`, error);
      // Fallback to default models
      setGenerationModels(
        DEFAULT_PROVIDER_MODELS[provider as keyof typeof DEFAULT_PROVIDER_MODELS] || 
        DEFAULT_PROVIDER_MODELS.openrouter
      );
    } finally {
      setLoadingGenerationModels(false);
    }
  };

  const loadEmbeddingModelsForProvider = async (provider: string) => {
    setLoadingEmbeddingModels(true);
    try {
      if (provider === "openai") {
        await fetchOpenAIEmbeddingModels();
      } else if (provider === "openrouter") {
        await fetchOpenRouterEmbeddingModels();
      } else {
        // For other providers, use default embedding models
        setEmbeddingModels(
          DEFAULT_EMBEDDING_MODELS[provider as keyof typeof DEFAULT_EMBEDDING_MODELS] || 
          DEFAULT_EMBEDDING_MODELS.openai
        );
      }
    } catch (error: any) {
      console.error(`Error loading embedding models for ${provider}:`, error);
      // Fallback to default models
      setEmbeddingModels(
        DEFAULT_EMBEDDING_MODELS[provider as keyof typeof DEFAULT_EMBEDDING_MODELS] || 
        DEFAULT_EMBEDDING_MODELS.openai
      );
    } finally {
      setLoadingEmbeddingModels(false);
    }
  };

  const fetchOpenAIModels = async () => {
    // Get OpenAI API key from database
    const { data, error } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('provider', 'openai')
      .single();

    if (error) throw error;
    if (!data) {
      // Use default models if no API key
      setGenerationModels(DEFAULT_PROVIDER_MODELS.openai);
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
      // Use default models if API call fails
      setGenerationModels(DEFAULT_PROVIDER_MODELS.openai);
      return;
    }

    const result = await response.json();
    
    // Filter for chat completion models (excluding embeddings, etc.)
    const chatModels = result.data
      .filter((model: any) => 
        model.id.includes('gpt') && 
        !model.id.includes('instruct') &&
        !model.id.includes('embedding') &&
        !model.id.includes('audio') &&
        !model.id.includes('vision')
      )
      .map((model: any) => model.id)
      .sort();
    
    if (chatModels.length > 0) {
      setGenerationModels(chatModels);
      // Update selected model if current one isn't available
      if (!chatModels.includes(config.generationModel)) {
        setConfig(prev => ({
          ...prev,
          generationModel: chatModels[0]
        }));
      }
    } else {
      setGenerationModels(DEFAULT_PROVIDER_MODELS.openai);
    }
  };

  const fetchOpenAIEmbeddingModels = async () => {
    // Get OpenAI API key from database
    const { data, error } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('provider', 'openai')
      .single();

    if (error) throw error;
    if (!data) {
      // Use default models if no API key
      setEmbeddingModels(DEFAULT_EMBEDDING_MODELS.openai);
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
      // Use default models if API call fails
      setEmbeddingModels(DEFAULT_EMBEDDING_MODELS.openai);
      return;
    }

    const result = await response.json();
    
    // Filter for embedding models
    const embeddingModels = result.data
      .filter((model: any) => model.id.includes('embedding'))
      .map((model: any) => model.id)
      .sort();
    
    if (embeddingModels.length > 0) {
      setEmbeddingModels(embeddingModels);
      // Update selected model if current one isn't available
      if (!embeddingModels.includes(config.embeddingModel)) {
        setConfig(prev => ({
          ...prev,
          embeddingModel: embeddingModels[0]
        }));
      }
    } else {
      setEmbeddingModels(DEFAULT_EMBEDDING_MODELS.openai);
    }
  };

  const fetchOpenRouterModels = async () => {
    // Get OpenRouter API key from database
    const { data, error } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('provider', 'openrouter')
      .single();

    if (error) throw error;
    if (!data) {
      // Use default models if no API key
      setGenerationModels(DEFAULT_PROVIDER_MODELS.openrouter);
      return;
    }

    // Fetch models from OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${data.api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Use default models if API call fails
      setGenerationModels(DEFAULT_PROVIDER_MODELS.openrouter);
      return;
    }

    const result = await response.json();
    
    // Extract model IDs from the response
    const models = result.data
      .map((model: any) => model.id)
      .sort();
    
    if (models.length > 0) {
      setGenerationModels(models);
      // Update selected model if current one isn't available
      if (!models.includes(config.generationModel)) {
        setConfig(prev => ({
          ...prev,
          generationModel: models[0]
        }));
      }
    } else {
      setGenerationModels(DEFAULT_PROVIDER_MODELS.openrouter);
    }
  };

  const fetchOpenRouterEmbeddingModels = async () => {
    // Get OpenRouter API key from database
    const { data, error } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('provider', 'openrouter')
      .single();

    if (error) throw error;
    if (!data) {
      // Use default models if no API key
      setEmbeddingModels(DEFAULT_EMBEDDING_MODELS.openrouter);
      return;
    }

    // Fetch models from OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${data.api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Use default models if API call fails
      setEmbeddingModels(DEFAULT_EMBEDDING_MODELS.openrouter);
      return;
    }

    const result = await response.json();
    
    // Filter for embedding models (models that contain 'embedding')
    const embeddingModels = result.data
      .filter((model: any) => model.id.includes('embedding'))
      .map((model: any) => model.id)
      .sort();
    
    if (embeddingModels.length > 0) {
      setEmbeddingModels(embeddingModels);
      // Update selected model if current one isn't available
      if (!embeddingModels.includes(config.embeddingModel)) {
        setConfig(prev => ({
          ...prev,
          embeddingModel: embeddingModels[0]
        }));
      }
    } else {
      // If no embedding models found, use default OpenAI embedding models
      setEmbeddingModels(DEFAULT_EMBEDDING_MODELS.openai);
    }
  };

  const handleSave = () => {
    // In a real implementation, this would save to the database
    toast({
      title: "Configuration Saved",
      description: "Model configuration has been updated successfully.",
    });
  };

  const handleReset = () => {
    setConfig({
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-large",
      generationProvider: availableProviders[0] || "openrouter",
      generationModel: DEFAULT_PROVIDER_MODELS[availableProviders[0] as keyof typeof DEFAULT_PROVIDER_MODELS]?.[0] || "openai/gpt-4o",
      temperature: 0.7,
      maxTokens: 2048,
    });
    
    // Reset models to defaults
    setGenerationModels(DEFAULT_PROVIDER_MODELS.openrouter);
    setEmbeddingModels(DEFAULT_EMBEDDING_MODELS.openai);
    
    toast({
      title: "Configuration Reset",
      description: "Model configuration has been reset to defaults.",
    });
  };

  // Update generation models when provider changes
  const handleGenerationProviderChange = (provider: string) => {
    setConfig(prev => ({
      ...prev,
      generationProvider: provider,
      generationModel: DEFAULT_PROVIDER_MODELS[provider as keyof typeof DEFAULT_PROVIDER_MODELS]?.[0] || ""
    }));
  };

  // Update embedding models when provider changes
  const handleEmbeddingProviderChange = (provider: string) => {
    setConfig(prev => ({
      ...prev,
      embeddingProvider: provider,
      embeddingModel: DEFAULT_EMBEDDING_MODELS[provider as keyof typeof DEFAULT_EMBEDDING_MODELS]?.[0] || 
                     DEFAULT_EMBEDDING_MODELS.openai?.[0] || ""
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Configuration</CardTitle>
        <CardDescription>
          Configure AI models used for embedding and generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Embedding Provider</Label>
            <Select 
              value={config.embeddingProvider} 
              onValueChange={handleEmbeddingProviderChange}
              disabled={loadingProviders}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select embedding provider" />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </SelectItem>
                ))}
                {availableProviders.length === 0 && (
                  <SelectItem value="openai" disabled>
                    No providers available - add API keys first
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Provider used for creating document embeddings
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Embedding Model</Label>
              {(config.embeddingProvider === "openai" || config.embeddingProvider === "openrouter") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => loadEmbeddingModelsForProvider(config.embeddingProvider)}
                  disabled={loadingEmbeddingModels}
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
              value={config.embeddingModel} 
              onValueChange={(value) => setConfig({...config, embeddingModel: value})}
              disabled={loadingEmbeddingModels}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select embedding model" />
              </SelectTrigger>
              <SelectContent>
                {embeddingModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
                {embeddingModels.length === 0 && (
                  <SelectItem value="" disabled>
                    No models available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Model used for creating document embeddings
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Generation Provider</Label>
            <Select 
              value={config.generationProvider} 
              onValueChange={handleGenerationProviderChange}
              disabled={loadingProviders}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select generation provider" />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </SelectItem>
                ))}
                {availableProviders.length === 0 && (
                  <SelectItem value="openrouter" disabled>
                    No providers available - add API keys first
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Provider used for generating responses
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Generation Model</Label>
              {(config.generationProvider === "openai" || config.generationProvider === "openrouter") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => loadGenerationModelsForProvider(config.generationProvider)}
                  disabled={loadingGenerationModels}
                >
                  {loadingGenerationModels ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              )}
            </div>
            <Select 
              value={config.generationModel} 
              onValueChange={(value) => setConfig({...config, generationModel: value})}
              disabled={loadingGenerationModels}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select generation model" />
              </SelectTrigger>
              <SelectContent>
                {generationModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
                {generationModels.length === 0 && (
                  <SelectItem value="" disabled>
                    No models available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Model used for generating responses
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value) || 0})}
              />
              <p className="text-sm text-muted-foreground">
                Controls randomness (0-2)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                min="1"
                max="4096"
                value={config.maxTokens}
                onChange={(e) => setConfig({...config, maxTokens: parseInt(e.target.value) || 2048})}
              />
              <p className="text-sm text-muted-foreground">
                Maximum response length
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Defaults
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
        </div>
        
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Provider Information</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Only providers with saved API keys are shown above. Add API keys in the "API Keys" tab to enable additional providers.
                For OpenAI and OpenRouter, you can refresh the model list to fetch available models from their APIs.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}