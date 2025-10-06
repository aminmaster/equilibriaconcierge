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
    "google/gemini-pro",
    "x-ai/grok-beta"  // Added xAI Grok model
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
  ],
  xai: [
    "grok-beta"
  ]
};

// Define default embedding models with their dimensions
const DEFAULT_EMBEDDING_MODELS = {
  openai: [
    { model: "text-embedding-3-large", dimensions: 3072 },
    { model: "text-embedding-3-small", dimensions: 1536 },
    { model: "text-embedding-ada-002", dimensions: 1536 }
  ],
  openrouter: [
    { model: "openai/text-embedding-3-large", dimensions: 3072 },
    { model: "openai/text-embedding-3-small", dimensions: 1536 },
    { model: "openai/text-embedding-ada-002", dimensions: 1536 }
  ]
};

export function ModelConfigTab() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"generation" | "embedding">("generation");
  
  // Generation config
  const [generationConfig, setGenerationConfig] = useState({
    provider: "openrouter",
    model: "openai/gpt-4o",
    temperature: 0.7,
    maxTokens: 2048,
  });
  
  // Embedding config
  const [embeddingConfig, setEmbeddingConfig] = useState({
    provider: "openai",
    model: "text-embedding-3-large",
    dimensions: 3072,
  });
  
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [generationModels, setGenerationModels] = useState<string[]>(
    DEFAULT_PROVIDER_MODELS.openrouter
  );
  const [embeddingModels, setEmbeddingModels] = useState<Array<{model: string, dimensions: number}>>(
    DEFAULT_EMBEDDING_MODELS.openai
  );
  const [loadingGenerationModels, setLoadingGenerationModels] = useState(false);
  const [loadingEmbeddingModels, setLoadingEmbeddingModels] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load available providers based on saved API keys
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
      
      // If we have providers, set the first one as default if current provider isn't available
      if (providers.length > 0) {
        // For generation config
        if (!providers.includes(generationConfig.provider)) {
          const newProvider = providers[0];
          setGenerationConfig(prev => ({
            ...prev,
            provider: newProvider,
            model: DEFAULT_PROVIDER_MODELS[newProvider as keyof typeof DEFAULT_PROVIDER_MODELS]?.[0] || ""
          }));
          
          // Load models for the new provider
          if (activeTab === "generation") {
            loadGenerationModelsForProvider(newProvider);
          }
        }
        
        // For embedding config
        if (!providers.includes(embeddingConfig.provider)) {
          const newProvider = providers.includes("openai") ? "openai" : providers[0];
          setEmbeddingConfig(prev => ({
            ...prev,
            provider: newProvider,
            model: DEFAULT_EMBEDDING_MODELS[newProvider as keyof typeof DEFAULT_EMBEDDING_MODELS]?.[0]?.model || 
                   DEFAULT_EMBEDDING_MODELS.openai?.[0]?.model || "",
            dimensions: DEFAULT_EMBEDDING_MODELS[newProvider as keyof typeof DEFAULT_EMBEDDING_MODELS]?.[0]?.dimensions || 
                        DEFAULT_EMBEDDING_MODELS.openai?.[0]?.dimensions || 1536
          }));
          
          // Load models for the new provider
          if (activeTab === "embedding") {
            loadEmbeddingModelsForProvider(newProvider);
          }
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

  // Load model configurations from database
  const loadModelConfigurations = async () => {
    try {
      // Load generation config
      const { data: generationData, error: generationError } = await supabase
        .from('model_configurations')
        .select('*')
        .eq('type', 'generation')
        .single();
      
      if (!generationError && generationData) {
        setGenerationConfig({
          provider: generationData.provider || "openrouter",
          model: generationData.model || "openai/gpt-4o",
          temperature: generationData.temperature || 0.7,
          maxTokens: generationData.max_tokens || 2048,
        });
      }
      
      // Load embedding config
      const { data: embeddingData, error: embeddingError } = await supabase
        .from('model_configurations')
        .select('*')
        .eq('type', 'embedding')
        .single();
      
      if (!embeddingError && embeddingData) {
        setEmbeddingConfig({
          provider: embeddingData.provider || "openai",
          model: embeddingData.model || "text-embedding-3-large",
          dimensions: embeddingData.dimensions || 3072,
        });
      }
    } catch (error: any) {
      console.error("Error loading model configurations:", error);
    }
  };

  // Load available providers and configurations on component mount
  useEffect(() => {
    loadAvailableProviders();
    loadModelConfigurations();
  }, []);

  // Load generation models when provider changes
  const loadGenerationModelsForProvider = async (provider: string) => {
    setLoadingGenerationModels(true);
    try {
      if (provider === "openai") {
        await fetchOpenAIModels();
      } else if (provider === "openrouter") {
        await fetchOpenRouterModels();
      } else if (provider === "xai") {
        // For xAI, use default models since we can't fetch them dynamically
        setGenerationModels(DEFAULT_PROVIDER_MODELS.xai);
        // Set default model if current one isn't available
        if (!DEFAULT_PROVIDER_MODELS.xai.includes(generationConfig.model)) {
          setGenerationConfig(prev => ({
            ...prev,
            model: DEFAULT_PROVIDER_MODELS.xai[0]
          }));
        }
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

  // Load embedding models when provider changes
  const loadEmbeddingModelsForProvider = async (provider: string) => {
    setLoadingEmbeddingModels(true);
    try {
      if (provider === "openai") {
        await fetchOpenAIEmbeddingModels();
      } else if (provider === "openrouter") {
        // For OpenRouter, we use OpenAI embedding models since OpenRouter provides access to them
        setEmbeddingModels(DEFAULT_EMBEDDING_MODELS.openrouter);
        // Set default model if current one isn't available
        if (!DEFAULT_EMBEDDING_MODELS.openrouter.some(m => m.model === embeddingConfig.model)) {
          setEmbeddingConfig(prev => ({
            ...prev,
            model: DEFAULT_EMBEDDING_MODELS.openrouter[0].model,
            dimensions: DEFAULT_EMBEDDING_MODELS.openrouter[0].dimensions
          }));
        }
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
      if (!chatModels.includes(generationConfig.model)) {
        setGenerationConfig(prev => ({
          ...prev,
          model: chatModels[0]
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
      .map((model: any) => {
        // Map known models to their dimensions
        let dimensions = 1536; // default
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
      // Update selected model if current one isn't available
      const currentModel = embeddingModels.find(m => m.model === embeddingConfig.model);
      if (!currentModel) {
        setEmbeddingConfig(prev => ({
          ...prev,
          model: embeddingModels[0].model,
          dimensions: embeddingModels[0].dimensions
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
      if (!models.includes(generationConfig.model)) {
        setGenerationConfig(prev => ({
          ...prev,
          model: models[0]
        }));
      }
    } else {
      setGenerationModels(DEFAULT_PROVIDER_MODELS.openrouter);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save generation configuration
      const { error: generationError } = await supabase
        .from('model_configurations')
        .upsert({
          id: 'generation-config',
          type: 'generation',
          provider: generationConfig.provider,
          model: generationConfig.model,
          temperature: generationConfig.temperature,
          max_tokens: generationConfig.maxTokens,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      
      if (generationError) throw generationError;
      
      // Save embedding configuration
      const { error: embeddingError } = await supabase
        .from('model_configurations')
        .upsert({
          id: 'embedding-config',
          type: 'embedding',
          provider: embeddingConfig.provider,
          model: embeddingConfig.model,
          dimensions: embeddingConfig.dimensions,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      
      if (embeddingError) throw embeddingError;
      
      toast({
        title: "Configuration Saved",
        description: "Model configuration has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving model configuration:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save model configuration.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setGenerationConfig({
      provider: "openrouter",
      model: "openai/gpt-4o",
      temperature: 0.7,
      maxTokens: 2048,
    });
    
    setEmbeddingConfig({
      provider: "openai",
      model: "text-embedding-3-large",
      dimensions: 3072,
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
    setGenerationConfig(prev => ({
      ...prev,
      provider: provider,
      model: DEFAULT_PROVIDER_MODELS[provider as keyof typeof DEFAULT_PROVIDER_MODELS]?.[0] || ""
    }));
    
    // Load models for the new provider
    loadGenerationModelsForProvider(provider);
  };

  // Update embedding models when provider changes
  const handleEmbeddingProviderChange = (provider: string) => {
    setEmbeddingConfig(prev => ({
      ...prev,
      provider: provider,
      model: DEFAULT_EMBEDDING_MODELS[provider as keyof typeof DEFAULT_EMBEDDING_MODELS]?.[0]?.model || 
             DEFAULT_EMBEDDING_MODELS.openai?.[0]?.model || "",
      dimensions: DEFAULT_EMBEDDING_MODELS[provider as keyof typeof DEFAULT_EMBEDDING_MODELS]?.[0]?.dimensions || 
                  DEFAULT_EMBEDDING_MODELS.openai?.[0]?.dimensions || 1536
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
    <Card>
      <CardHeader>
        <CardTitle>Model Configuration</CardTitle>
        <CardDescription>
          Configure AI models used for generation and embedding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex border-b">
          <Button
            variant={activeTab === "generation" ? "default" : "ghost"}
            className="rounded-b-none"
            onClick={() => setActiveTab("generation")}
          >
            Generation Models
          </Button>
          <Button
            variant={activeTab === "embedding" ? "default" : "ghost"}
            className="rounded-b-none"
            onClick={() => setActiveTab("embedding")}
          >
            Embedding Models
          </Button>
        </div>

        {/* Generation Tab Content */}
        {activeTab === "generation" && (
          <div className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Generation Provider</Label>
                <Select 
                  value={generationConfig.provider} 
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
                  {(generationConfig.provider === "openai" || generationConfig.provider === "openrouter") && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => loadGenerationModelsForProvider(generationConfig.provider)}
                      disabled={loadingGenerationModels || loadingProviders}
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
                  value={generationConfig.model} 
                  onValueChange={(value) => setGenerationConfig({...generationConfig, model: value})}
                  disabled={loadingGenerationModels || loadingProviders}
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
                    value={generationConfig.temperature}
                    onChange={(e) => setGenerationConfig({...generationConfig, temperature: parseFloat(e.target.value) || 0})}
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
                    value={generationConfig.maxTokens}
                    onChange={(e) => setGenerationConfig({...generationConfig, maxTokens: parseInt(e.target.value) || 2048})}
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum response length
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Embedding Tab Content */}
        {activeTab === "embedding" && (
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Embedding Model</Label>
                    {embeddingConfig.provider === "openai" && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => loadEmbeddingModelsForProvider(embeddingConfig.provider)}
                        disabled={loadingEmbeddingModels || loadingProviders}
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
                    disabled={loadingEmbeddingModels || loadingProviders}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select embedding model" />
                    </SelectTrigger>
                    <SelectContent>
                      {embeddingModels.map((model) => (
                        <SelectItem key={model.model} value={model.model}>
                          {model.model} ({model.dimensions} dimensions)
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
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Defaults
          </Button>
          <Button onClick={handleSave} className="gap-2" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
        
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Provider Information</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Only providers with saved API keys are shown above. Add API keys in the "API Keys" tab to enable additional providers.
                For OpenAI, you can refresh the model list to fetch available models from their API.
                For OpenRouter, embedding models are provided through OpenAI's API.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}