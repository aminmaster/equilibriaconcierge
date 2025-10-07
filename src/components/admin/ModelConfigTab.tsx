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
import { 
  Save, 
  RotateCcw,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GenerationConfigSection } from "@/components/admin/model-config/GenerationConfigSection";
import { EmbeddingConfigSection } from "@/components/admin/model-config/EmbeddingConfigSection";
import { useModelConfig } from "@/hooks/use-model-config";

// Define default models for each provider (fallback when API fetching isn't possible)
const DEFAULT_PROVIDER_MODELS = {
  openrouter: [
    "openai/gpt-4o",
    "openai/gpt-4-turbo",
    "openai/gpt-3.5-turbo",
    "anthropic/claude-3-opus",
    "anthropic/claude-3-sonnet",
    "google/gemini-pro",
    "x-ai/grok-beta"
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
  ],
  cohere: [
    "command-r-plus",
    "command-r",
    "command"
  ],
  google: [
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-1.0-pro"
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
  ],
  cohere: [
    { model: "embed-english-v3.0", dimensions: 1024 },
    { model: "embed-multilingual-v3.0", dimensions: 1024 }
  ]
};

export function ModelConfigTab() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"generation" | "embedding">("generation");
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Use the enhanced model config hook
  const { config, saveConfig, resetToDefaults } = useModelConfig();
  
  // State to hold current config values from child components
  const [generationConfig, setGenerationConfig] = useState<any>(null);
  const [embeddingConfig, setEmbeddingConfig] = useState<any>(null);

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
      const providers = [...new Set(data?.map((key: any) => key.provider) || [])];
      setAvailableProviders(providers);
      
      return providers;
    } catch (error: any) {
      console.error("Error loading providers:", error);
      toast({
        title: "Failed to Load Providers",
        description: error.message || "Could not load available providers.",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoadingProviders(false);
    }
  };

  // Load available providers on component mount
  useEffect(() => {
    loadAvailableProviders();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    
    console.log("Attempting to save configuration");
    console.log("Generation config:", generationConfig);
    console.log("Embedding config:", embeddingConfig);
    
    try {
      // Validate that we have config data
      if (!generationConfig) {
        throw new Error("Generation configuration data not available. Please make a selection first.");
      }
      
      if (!embeddingConfig) {
        throw new Error("Embedding configuration data not available. Please make a selection first.");
      }
      
      // Create the full configuration object
      const fullConfig = {
        generation: generationConfig,
        embedding: embeddingConfig
      };
      
      // Save using the enhanced hook
      const success = await saveConfig(fullConfig);
      
      if (success) {
        toast({
          title: "Configuration Saved",
          description: "Model configuration has been updated successfully.",
        });
      }
    } catch (error: any) {
      console.error("Error saving configuration:", error);
      toast({
        title: "Failed to Save Configuration",
        description: error.message || "Could not save model configuration.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const success = await resetToDefaults();
      if (success) {
        // Reload the page to refresh the configuration
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Error resetting configuration:", error);
      toast({
        title: "Failed to Reset Configuration",
        description: error.message || "Could not reset model configuration.",
        variant: "destructive",
      });
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
          <div className="pt-4">
            <GenerationConfigSection 
              availableProviders={availableProviders}
              loadingProviders={loadingProviders}
              defaultProviderModels={DEFAULT_PROVIDER_MODELS}
              onConfigChange={setGenerationConfig}
            />
          </div>
        )}

        {/* Embedding Tab Content */}
        {activeTab === "embedding" && (
          <div className="pt-4">
            <EmbeddingConfigSection 
              availableProviders={availableProviders}
              loadingProviders={loadingProviders}
              defaultEmbeddingModels={DEFAULT_EMBEDDING_MODELS}
              onConfigChange={setEmbeddingConfig}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Defaults
          </Button>
          <Button onClick={handleSave} className="gap-2" disabled={saving || availableProviders.length === 0}>
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
        
        {availableProviders.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">API Keys Required</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Add API keys in the "API Keys" tab to enable model selection. 
                  The configuration options above will become available once you add at least one API key.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}