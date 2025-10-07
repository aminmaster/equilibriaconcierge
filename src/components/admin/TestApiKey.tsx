"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle 
} from "lucide-react";

interface ApiKeyInfo {
  id: string;
  provider: string;
  keyLength: number;
  createdAt: string;
  updatedAt: string;
  testResult?: {
    success: boolean;
    message: string;
  };
}

export function TestApiKey() {
  const { toast } = useToast();
  const [keyInfo, setKeyInfo] = useState<ApiKeyInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // Load all API keys on component mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('provider');

      if (error) {
        console.error("Database error:", error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        toast({
          title: "No API Keys Found",
          description: "No API keys found in the database.",
        });
        setKeyInfo([]);
        setLoading(false);
        return;
      }

      const keyInfoArray = data.map((key: any) => ({
        id: key.id,
        provider: key.provider,
        keyLength: key.api_key.length,
        createdAt: key.created_at,
        updatedAt: key.updated_at
      }));

      setKeyInfo(keyInfoArray);
    } catch (error: any) {
      console.error("Error retrieving API keys:", error);
      toast({
        title: "Failed to Retrieve API Keys",
        description: error.message || "Could not retrieve API keys from database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testAllApiKeys = async () => {
    if (!keyInfo || keyInfo.length === 0) return;
    
    setTesting(true);
    const updatedKeyInfo = [...keyInfo];
    
    try {
      // Test each API key using the edge function
      for (let i = 0; i < updatedKeyInfo.length; i++) {
        const key = updatedKeyInfo[i];
        try {
          // Get session token
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          
          if (!token) {
            throw new Error("Not authenticated");
          }
          
          // Call the test-api-key edge function
          const response = await fetch('https://jmxemujffofqpqrxajlb.supabase.co/functions/v1/test-api-key', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ provider: key.provider })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }
          
          const testData = await response.json();
          
          updatedKeyInfo[i].testResult = { 
            success: testData.isValid, 
            message: testData.testResult 
          };
        } catch (error: any) {
          updatedKeyInfo[i].testResult = { 
            success: false, 
            message: error.message || "Test failed" 
          };
        }
      }
      
      setKeyInfo(updatedKeyInfo);
      toast({
        title: "API Key Tests Completed",
        description: "All API keys have been tested.",
      });
    } catch (error: any) {
      console.error("Error testing API keys:", error);
      toast({
        title: "Failed to Test API Keys",
        description: error.message || "Could not test API keys.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test API Key Retrieval</CardTitle>
        <CardDescription>
          Debug tool to verify API key storage and retrieval for all providers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={loadApiKeys} disabled={loading} variant="outline">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Refresh API Keys"
            )}
          </Button>
          
          <Button onClick={testAllApiKeys} disabled={testing || loading || !keyInfo || keyInfo.length === 0}>
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test All API Keys"
            )}
          </Button>
        </div>
        
        {keyInfo && keyInfo.length > 0 && (
          <div className="space-y-4">
            {keyInfo.map((key) => (
              <div key={key.id} className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium mb-1">{key.provider.toUpperCase()} API Key</h3>
                    <p className="text-sm text-muted-foreground">
                      ID: {key.id.substring(0, 8)}...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(key.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {key.testResult && (
                    <div className="flex items-center gap-2">
                      {key.testResult.success ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-green-500 text-sm">Valid</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span className="text-red-500 text-sm">Invalid</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {key.testResult && (
                  <div className={`mt-2 p-2 rounded text-sm ${
                    key.testResult.success 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {key.testResult.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {keyInfo && keyInfo.length === 0 && !loading && (
          <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <p className="text-blue-800">No API keys found in the database.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}