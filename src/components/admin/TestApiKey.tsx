"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function TestApiKey() {
  const { toast } = useToast();
  const [keyInfo, setKeyInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testApiKey = async () => {
    setLoading(true);
    try {
      // Get OpenAI API key from database
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('provider', 'openai')
        .single();

      if (error) {
        console.error("Database error:", error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data) {
        toast({
          title: "API Key Not Found",
          description: "No OpenAI API key found in the database.",
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
        description: `Found API key with ID: ${data.id.substring(0, 8)}...`,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test API Key Retrieval</CardTitle>
        <CardDescription>
          Debug tool to verify API key storage and retrieval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testApiKey} disabled={loading}>
          {loading ? "Testing..." : "Test API Key Retrieval"}
        </Button>
        
        {keyInfo && (
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">API Key Information</h3>
            <pre className="text-sm bg-background p-2 rounded">
              {JSON.stringify(keyInfo, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}