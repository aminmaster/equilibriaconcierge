"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  Loader2,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Model {
  id: string;
  name: string;
}

interface ModelConfigurationFormProps {
  apiKeys: any[];
  providerStatus: Record<string, boolean>;
  selectedGenerationProvider: string;
  setSelectedGenerationProvider: (provider: string) => void;
  selectedEmbeddingProvider: string;
  setSelectedEmbeddingProvider: (provider: string) => void;
  selectedGenerationModel: string;
  setSelectedGenerationModel: (model: string) => void;
  selectedEmbeddingModel: string;
  setSelectedEmbeddingModel: (model: string) => void;
  generationModels: Model[];
  setGenerationModels: (models: Model[]) => void;
  embeddingModels: Model[];
  setEmbeddingModels: (models: Model[]) => void;
  modelsLoading: boolean;
  setModelsLoading: (loading: boolean) => void;
}

export function ModelConfigurationForm({
  apiKeys,
  providerStatus,
  selectedGenerationProvider,
  setSelectedGenerationProvider,
  selectedEmbeddingProvider,
  setSelectedEmbeddingProvider,
  selectedGenerationModel,
  setSelectedGenerationModel,
  selectedEmbeddingModel,
  setSelectedEmbeddingModel,
  generationModels,
  setGenerationModels,
  embeddingModels,
  setEmbeddingModels,
  modelsLoading,
  setModelsLoading
}: ModelConfigurationFormProps) {
  const { toast } = useToast();
  
  // Available providers
  const availableProviders = [
    { id: "openrouter", name: "OpenRouter" },
    { id: "openai", name: "OpenAI" },
    { id: "anthropic", name: "Anthropic" },
    { id: "cohere", name: "Cohere" }
  ];

  // Load generation models based on selected provider
  const loadGenerationModels = async () => {
    if (!selectedGenerationProvider) return;
    
    // Check if we have an API key for this provider
    const hasApiKey = apiKeys.some((key: any) => key.provider === selectedGenerationProvider);
    if (!hasApiKey) {
      toast({
        title: "API Key Required",
        description: `Please add an API key for ${selectedGenerationProvider} first.`,
        variant: "destructive",
      });
      return;
    }
    
    setModelsLoading(true);
    try {
      let modelList: Model[] = [];
      
      if (selectedGenerationProvider === "openrouter") {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (response.ok) {
          const data = await response.json();
          modelList = data.data.map((model: any) => ({
            id: model.id,
            name: model.name
          }));
        }
      } else if (selectedGenerationProvider === "openai") {
        // OpenAI models
        modelList = [
          { id: "gpt-4o", name: "GPT-4o" },
          { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
          { id: "gpt-4", name: "GPT-4" },
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" }
        ];
      } else if (selectedGenerationProvider === "anthropic") {
        // Anthropic models
        modelList = [
          { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet" },
          { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
          { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
          { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" }
        ];
      }
      
      setGenerationModels(modelList);
      
      // Set a default model if none is selected
      if (!selectedGenerationModel && modelList.length > 0) {
        setSelectedGenerationModel(modelList[0].id);
      }
      
      if (modelList.length === 0) {
        toast({
          title: "No Models Found",
          description: `No models available from ${selectedGenerationProvider}.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Models Loaded",
          description: `Successfully loaded ${modelList.length} models from ${selectedGenerationProvider}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Load Models",
        description: error.message || `Could not fetch models from ${selectedGenerationProvider}.`,
        variant: "destructive",
      });
    } finally {
      setModelsLoading(false);
    }
  };

  // Load embedding models based on selected provider
  const loadEmbeddingModels = async () => {
    if (!selectedEmbeddingProvider) return;
    
    // Check if we have an API key for this provider
    const hasApiKey = apiKeys.some((key: any) => key.provider === selectedEmbeddingProvider);
    if (!hasApiKey) {
      toast({
        title: "API Key Required",
        description: `Please add an API key for ${selectedEmbeddingProvider} first.`,
        variant: "destructive",
      });
      return;
    }
    
    setModelsLoading(true);
    try {
      let modelList: Model[] = [];
      
      if (selectedEmbeddingProvider === "openai") {
        // OpenAI embedding models
        modelList = [
          { id: "text-embedding-3-large", name: "Text Embedding 3 Large" },
          { id: "text-embedding-3-small", name: "Text Embedding 3 Small" },
          { id: "text-embedding-ada-002", name: "Text Embedding Ada 002" }
        ];
      } else if (selectedEmbeddingProvider === "cohere") {
        // Cohere embedding models
        modelList = [
          { id: "embed-english-v3.0", name: "Embed English v3.0" },
          { id: "embed-multilingual-v3.0", name: "Embed Multilingual v3.0" },
          { id: "embed-english-light-v3.0", name: "Embed English Light v3.0" }
        ];
      }
      
      setEmbeddingModels(modelList);
      
      // Set a default model if none is selected
      if (!selectedEmbeddingModel && modelList.length > 0) {
        setSelectedEmbeddingModel(modelList[0].id);
      }
      
      if (modelList.length === 0) {
        toast({
          title: "No Embedding Models Found",
          description: `No embedding models available from ${selectedEmbeddingProvider}.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Embedding Models Loaded",
          description: `Successfully loaded ${modelList.length} embedding models from ${selectedEmbeddingProvider}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Load Embedding Models",
        description: error.message || `Could not fetch embedding models from ${selectedEmbeddingProvider}.`,
        variant: "destructive",
      });
    } finally {
      setModelsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation Model Configuration */}
      <div className="space-y-4 p-4 border rounded-lg bg-background">
        <h3 className="font-medium text-lg">Text Generation</h3>
        
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select 
            value={selectedGenerationProvider} 
            onValueChange={(value) => {
              setSelectedGenerationProvider(value);
              setSelectedGenerationModel("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {availableProviders
                .filter(provider => providerStatus[provider.id])
                .map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {selectedGenerationProvider && !providerStatus[selectedGenerationProvider] && (
            <p className="text-sm text-destructive">
              Please add an API key for this provider in the API Keys tab.
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Model</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadGenerationModels}
              disabled={modelsLoading || !selectedGenerationProvider || !providerStatus[selectedGenerationProvider]}
            >
              {modelsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Refresh Models"
              )}
            </Button>
          </div>
          <Select 
            value={selectedGenerationModel} 
            onValueChange={setSelectedGenerationModel}
            disabled={!selectedGenerationProvider || !providerStatus[selectedGenerationProvider]}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {generationModels.length > 0 ? (
                generationModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="" disabled>
                  {selectedGenerationProvider ? "No models loaded - click Refresh Models" : "Select a provider first"}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          
          {/* Empty State for Generation Models */}
          {selectedGenerationProvider && 
           providerStatus[selectedGenerationProvider] && 
           !modelsLoading && 
           generationModels.length === 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>No Models Found</CardTitle>
                <CardDescription>
                  We couldn't fetch the list of available models from the provider API. 
                  This might be a temporary issue with the service or your network.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={loadGenerationModels}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Fetch
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
      
      {/* Embedding Model Configuration */}
      <div className="space-y-4 p-4 border rounded-lg bg-background">
        <h3 className="font-medium text-lg">Text Embedding</h3>
        
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select 
            value={selectedEmbeddingProvider} 
            onValueChange={(value) => {
              setSelectedEmbeddingProvider(value);
              setSelectedEmbeddingModel("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {availableProviders
                .filter(provider => providerStatus[provider.id])
                .map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {selectedEmbeddingProvider && !providerStatus[selectedEmbeddingProvider] && (
            <p className="text-sm text-destructive">
              Please add an API key for this provider in the API Keys tab.
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Model</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadEmbeddingModels}
              disabled={modelsLoading || !selectedEmbeddingProvider || !providerStatus[selectedEmbeddingProvider]}
            >
              {modelsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Refresh Models"
              )}
            </Button>
          </div>
          <Select 
            value={selectedEmbeddingModel} 
            onValueChange={setSelectedEmbeddingModel}
            disabled={!selectedEmbeddingProvider || !providerStatus[selectedEmbeddingProvider]}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select embedding model" />
            </SelectTrigger>
            <SelectContent>
              {embeddingModels.length > 0 ? (
                embeddingModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="" disabled>
                  {selectedEmbeddingProvider ? "No models loaded - click Refresh Models" : "Select a provider first"}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          
          {/* Empty State for Embedding Models */}
          {selectedEmbeddingProvider && 
           providerStatus[selectedEmbeddingProvider] && 
           !modelsLoading && 
           embeddingModels.length === 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>No Models Found</CardTitle>
                <CardDescription>
                  We couldn't fetch the list of available embedding models from the provider API. 
                  This might be a temporary issue with the service or your network.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={loadEmbeddingModels}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Fetch
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
      
      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>Temperature</Label>
          <Input 
            type="range" 
            min="0" 
            max="2" 
            step="0.1" 
            defaultValue="0.7" 
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Precise</span>
            <span>Balanced</span>
            <span>Creative</span>
          </div>
        </div>
      </div>
    </div>
  );
}