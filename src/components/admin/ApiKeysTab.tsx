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
  CheckCircle,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApiKey {
  id: string;
  provider: string;
  created_at: string;
}

const availableProviders = [
  { id: "openrouter", name: "OpenRouter" },
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "cohere", name: "Cohere" }
];

export function ApiKeysTab() {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiKey, setNewApiKey] = useState({ provider: "", key: "" });
  const [loading, setLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({});

  // Load API keys on component mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, provider, created_at')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Database error:", error);
        toast({
          title: "Failed to Load API Keys",
          description: error.message || "Could not fetch API keys.",
          variant: "destructive",
        });
        setApiKeys([]);
      } else if (data) {
        setApiKeys(data);
        
        // Update provider status
        const status: Record<string, boolean> = {};
        data.forEach((key: ApiKey) => {
          status[key.provider] = true;
        });
        setProviderStatus(status);
      }
    } catch (error: any) {
      toast({
        title: "Failed to Load API Keys",
        description: error.message || "Could not fetch API keys.",
        variant: "destructive",
      });
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const addApiKey = async () => {
    if (!newApiKey.provider || !newApiKey.key) {
      toast({
        title: "Missing Information",
        description: "Please select a provider and enter an API key.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{
          provider: newApiKey.provider,
          api_key: newApiKey.key
        }])
        .select('id, provider, created_at');
      
      if (error) {
        throw new Error(error.message);
      } else if (data && data.length > 0) {
        setApiKeys([data[0], ...apiKeys]);
        setNewApiKey({ provider: "", key: "" });
        setProviderStatus({ ...providerStatus, [newApiKey.provider]: true });
        
        toast({
          title: "API Key Added",
          description: `Successfully added API key for ${newApiKey.provider}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Add API Key",
        description: error.message || "Could not add API key.",
        variant: "destructive",
      });
    }
  };

  const deleteApiKey = async (id: string, provider: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      } else {
        setApiKeys(apiKeys.filter(key => key.id !== id));
        setProviderStatus({ ...providerStatus, [provider]: false });
        
        toast({
          title: "API Key Deleted",
          description: `Successfully deleted API key for ${provider}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Delete API Key",
        description: error.message || "Could not delete API key.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Securely manage your API keys
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Add New API Key</Label>
            <div className="flex gap-2">
              <Select 
                value={newApiKey.provider} 
                onValueChange={(value) => setNewApiKey({...newApiKey, provider: value})}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="password"
                placeholder="API key"
                value={newApiKey.key}
                onChange={(e) => setNewApiKey({...newApiKey, key: e.target.value})}
                className="flex-1"
              />
              <Button onClick={addApiKey}>Add</Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Saved API Keys</Label>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : apiKeys.length === 0 ? (
              <p className="text-muted-foreground text-sm">No API keys saved yet.</p>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {providerStatus[key.provider] ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {availableProviders.find(p => p.id === key.provider)?.name || key.provider}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Added {new Date(key.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteApiKey(key.id, key.provider)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}