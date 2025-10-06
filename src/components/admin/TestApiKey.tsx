"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function TestApiKey() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [keyInfo, setKeyInfo] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Load available providers with API keys
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      // Get all API keys from database
      const { data, error } = await supabase
        .from('api_keys')
        .select('provider');
      
      if (error) throw error;
      
      // Extract unique providers
      const uniqueProviders = [...new Set(data.map((key: any) => key.provider))];
      setProviders(uniqueProviders);
      
      // Set first provider as selected if available
      if (uniqueProviders.length > 0 && !selectedProvider) {
        setSelectedProvider(uniqueProviders[0]);
      }
    } catch (error: any) {
      console.error("Error loading providers:", error);
      toast({
        title: "Failed to Load Providers",
        description: error.message || "Could not load available providers.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testApiKey = async () => {
    if (!selectedProvider) {
      toast({
        title: "No Provider Selected",
        description: "Please select a provider to test.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      // Get API key from database
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('provider', selectedProvider)
        .single();

      if (error) {
        console.error("Database error:", error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data) {
        toast({
          title: "API Key Not Found",
          description: `No API key found for ${selectedProvider} in the database.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setKeyInfo({
        id: data.id,
        provider: data.provider,
        keyLength: data.api_key.length,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      });

      toast({
        title: "API Key Retrieved",
        description: `Found API key for ${selectedProvider}.`,
      });
    } catch (error: any) {
      console.error("Error retrieving API key:", error);
      toast({
        title: "Failed to Retrieve API Key",
        description: error.message || "Could not retrieve API key from database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    if (!selectedProvider) {
      toast({
        title: "No Provider Selected",
        description: "Please select a provider to fetch models.",
        variant: "destructive",
      });
      return;
    }
    
    setLoadingModels(true);
    try {
      // Get API key from database
      const { data, error } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('provider', selectedProvider)
        .single();

      if (error) throw error;
      if (!data) {
        toast({
          title: "API Key Not Found",
          description: `No API key found for ${selectedProvider}.`,
          variant: "destructive",
        });
        setLoadingModels(false);
        return;
      }

      let response;
      let modelsData;
      
      // Fetch models based on provider
      switch (selectedProvider) {
        case "openai":
          response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${data.api_key}`,
              'Content-Type': 'application/json'
            }
          });
          break;
        case "openrouter":
          response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
              'Authorization': `Bearer ${data.api_key}`,
              'Content-Type': 'application/json'
            }
          });
          break;
        default:
          toast({
            title: "Unsupported Provider",
            description: `Model fetching not implemented for ${selectedProvider}.`,
            variant: "destructive",
          });
          setLoadingModels(false);
          return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      modelsData = result.data || [];
      
      setModels(modelsData);
      
      toast({
        title: "Models Retrieved",
        description: `Found ${modelsData.length} models for ${selectedProvider}.`,
      });
    } catch (error: any) {
      console.error(`Error fetching models for ${selectedProvider}:`, error);
      toast({
        title: "Failed to Fetch Models",
        description: error.message || `Could not fetch models from ${selectedProvider} API.`,
        variant: "destructive",
      });
    } finally {
      setLoadingModels(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test API Keys</CardTitle>
        <CardDescription>
          Test API key retrieval and model fetching for providers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Provider</label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </SelectItem>
                ))}
                {providers.length === 0 && (
                  <SelectItem value="" disabled>
                    No providers with API keys found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={testApiKey} disabled={loading || !selectedProvider}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test API Key Retrieval"
              )}
            </Button>
            
            <Button 
              onClick={fetchModels} 
              disabled={loadingModels || !selectedProvider}
              variant="secondary"
            >
              {loadingModels ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Models...
                </>
              ) : (
                "Fetch Models"
              )}
            </Button>
          </div>
        </div>
        
        {keyInfo && (
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">API Key Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Provider:</span>
                <span className="ml-2 font-medium">{keyInfo.provider}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Key Length:</span>
                <span className="ml-2 font-medium">{keyInfo.keyLength} characters</span>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <span className="ml-2 font-medium">{new Date(keyInfo.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Updated:</span>
                <span className="ml-2 font-medium">{new Date(keyInfo.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Key ID:</span>
                <span className="ml-2 font-mono text-xs">{keyInfo.id}</span>
              </div>
            </div>
          </div>
        )}
        
        {models.length > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Available Models ({models.length})</h3>
            <div className="max-h-60 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {models.map((model: any, index: number) => (
                  <div key={index} className="p-2 bg-background rounded text-sm">
                    <div className="font-medium">{model.id || model.name || 'Unknown Model'}</div>
                    {model.description && (
                      <div className="text-muted-foreground text-xs mt-1">{model.description}</div>
                    )}
                    {model.created && (
                      <div className="text-muted-foreground text-xs">
                        Created: {new Date(model.created * 1000).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="pt-4">
          <Button onClick={loadProviders} variant="outline" size="sm">
            Refresh Provider List
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}