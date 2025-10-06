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
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function ModelConfigTab() {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    embeddingModel: "text-embedding-3-large",
    generationProvider: "openrouter",
    generationModel: "openai/gpt-4o",
    temperature: 0.7,
    maxTokens: 2048,
  });
  const [embeddingModels, setEmbeddingModels] = useState<string[]>([
    "text-embedding-3-large",
    "text-embedding-3-small",
    "text-embedding-ada-002"
  ]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch available embedding models from OpenAI
  const fetchEmbeddingModels = async () => {
    setLoadingModels(true);
    try {
      // Get OpenAI API key from database
      const { data, error } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('provider', 'openai')
        .single();

      if (error) throw error;
      if (!data) {
        toast({
          title: "API Key Not Found",
          description: "Please add an OpenAI API key to fetch available models.",
          variant: "destructive",
        });
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
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Filter for embedding models
      const embeddingModels = result.data
        .filter((model: any) => model.id.includes('embedding'))
        .map((model: any) => model.id)
        .sort();
      
      if (embeddingModels.length > 0) {
        setEmbeddingModels(embeddingModels);
        toast({
          title: "Models Loaded",
          description: `Found ${embeddingModels.length} embedding models.`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching models:", error);
      toast({
        title: "Failed to Load Models",
        description: error.message || "Could not fetch embedding models from OpenAI.",
        variant: "destructive",
      });
    } finally {
      setLoadingModels(false);
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
      embeddingModel: "text-embedding-3-large",
      generationProvider: "openrouter",
      generationModel: "openai/gpt-4o",
      temperature: 0.7,
      maxTokens: 2048,
    });
    toast({
      title: "Configuration Reset",
      description: "Model configuration has been reset to defaults.",
    });
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
            <div className="flex justify-between items-center">
              <Label>Embedding Model</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchEmbeddingModels}
                disabled={loadingModels}
              >
                {loadingModels ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
            <Select 
              value={config.embeddingModel} 
              onValueChange={(value) => setConfig({...config, embeddingModel: value})}
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
              onValueChange={(value) => setConfig({...config, generationProvider: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select generation provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Generation Model</Label>
            <Select 
              value={config.generationModel} 
              onValueChange={(value) => setConfig({...config, generationModel: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select generation model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="openai/gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="anthropic/claude-3-opus">Claude 3 Opus</SelectItem>
                <SelectItem value="anthropic/claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                <SelectItem value="google/gemini-pro">Gemini Pro</SelectItem>
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
      </CardContent>
    </Card>
  );
}