"use client";

import { useState } from "react";
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
  XCircle,
  Loader2,
  TestTube
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApiKeys } from "@/hooks/use-api-keys";

const availableProviders = [
  { id: "openrouter", name: "OpenRouter" },
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "cohere", name: "Cohere" }
];

export function ApiKeysTab() {
  const { 
    apiKeys, 
    loading, 
    addApiKey, 
    deleteApiKey, 
    testApiKey 
  } = useApiKeys();
  const { toast } = useToast();
  const [newApiKey, setNewApiKey] = useState({ provider: "", key: "" });
  const [testingKeys, setTestingKeys] = useState<Record<string, boolean>>({});

  const handleAddApiKey = async () => {
    if (!newApiKey.provider || !newApiKey.key) {
      toast({
        title: "Missing Information",
        description: "Please select a provider and enter an API key.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await addApiKey(newApiKey.provider, newApiKey.key);
      setNewApiKey({ provider: "", key: "" });
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleTestApiKey = async (id: string, provider: string) => {
    setTestingKeys(prev => ({ ...prev, [id]: true }));
    try {
      await testApiKey(id, provider);
    } catch (error) {
      // Error is already handled in the hook
    } finally {
      setTestingKeys(prev => ({ ...prev, [id]: false }));
    }
  };

  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return "••••••••";
    return `${key.substring(0, 4)}••••${key.substring(key.length - 4)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Securely manage your API keys for different providers
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
              <Button onClick={handleAddApiKey}>Add</Button>
            </div>
            <p className="text-sm text-muted-foreground">
              API keys are encrypted before being stored in the database for security.
            </p>
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
                      <div>
                        <p className="font-medium">
                          {availableProviders.find(p => p.id === key.provider)?.name || key.provider}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {maskApiKey(key.api_key)} • Added {new Date(key.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestApiKey(key.id, key.provider)}
                        disabled={testingKeys[key.id]}
                      >
                        {testingKeys[key.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                        Test
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => deleteApiKey(key.id, key.provider)}
                      >
                        Remove
                      </Button>
                    </div>
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