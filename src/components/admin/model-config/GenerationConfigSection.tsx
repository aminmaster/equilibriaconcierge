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

interface GenerationConfigSectionProps {
  availableProviders: string[];
  loadingProviders: boolean;
  defaultProviderModels: Record<string, string[]>;
}

export function GenerationConfigSection({ 
  availableProviders, 
  loadingProviders,
  defaultProviderModels
}: GenerationConfigSectionProps) {
  // Generation config
  const [generationConfig, setGenerationConfig] = useState({
    provider: "openrouter",
    model: "openai/gpt-4o",
    temperature: 0.7,
    maxTokens: 2048,
  });
  
  const [generationModels, setGenerationModels] = useState<string[]>(
    defaultProviderModels.openrouter
  );
  const [loadingGenerationModels, setLoadingGenerationModels] = useState(false);
  const { toast } = useToast();

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
          temperature: generationData.temperature !== null ? generationData.temperature : 0.7,
          maxTokens: generationData.max_tokens || 2048,
        });
        
        // Load models for the saved provider
        if (generationData.provider) {
          await loadGenerationModelsForProvider(generationData.provider);
        }
      }
    } catch (error: any) {
      console.error("Error loading model configurations:", error);
    }
  };

  // Load generation models when provider changes
  const loadGenerationModelsForProvider = async (provider: string) => {
    setLoadingGenerationModels(true);
    try {
      if (provider === "openai") {
        await fetchOpenAIModels();
      } else if (provider === "openrouter") {
        await fetchOpenRouterModels();
      } else if (provider === "xai") {
        setGenerationModels(defaultProviderModels.xai);
      } else {
        setGenerationModels(
          defaultProviderModels[provider as keyof typeof defaultProviderModels] || 
          defaultProviderModels.openrouter
        );
      }
    } catch (error: any) {
      console.error(`Error loading generation models for ${provider}:`, error);
      setGenerationModels(
        defaultProviderModels[provider as keyof typeof defaultProviderModels] || 
        defaultProviderModels.openrouter
      );
    } finally {
      setLoadingGenerationModels(false);
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
      setGenerationModels(defaultProviderModels.openai);
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
      setGenerationModels(defaultProviderModels.openai);
      return;
    }

    const result = await response.json();
    
    // Filter for chat completion models
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
    } else {
      setGenerationModels(defaultProviderModels.openai);
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
      setGenerationModels(defaultProviderModels.openrouter);
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
      setGenerationModels(defaultProviderModels.openrouter);
      return;
    }

    const result = await response.json();
    
    // Extract model IDs from the response
    const models = result.data
      .map((model: any) => model.id)
      .sort();
    
    if (models.length > 0) {
      setGenerationModels(models);
    } else {
      setGenerationModels(defaultProviderModels.openrouter);
    }
  };

  // Load configurations on component mount
  useEffect(() => {
    loadModelConfigurations();
  }, []);

  // Update generation models when provider changes
  const handleGenerationProviderChange = (provider: string) => {
    setGenerationConfig(prev => ({
      ...prev,
      provider: provider,
      model: defaultProviderModels[provider as keyof typeof defaultProviderModels]?.[0] || ""
    }));
    
    // Load models for the new provider
    loadGenerationModelsForProvider(provider);
  };

  return (
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
                disabled={loadingGenerationModels || loadingProviders || availableProviders.length === 0}
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
            disabled={loadingGenerationModels || loadingProviders || availableProviders.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select generation model" />
            </SelectTrigger>
            <SelectContent>
              {generationModels.length > 0 ? (
                generationModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
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
  );
}