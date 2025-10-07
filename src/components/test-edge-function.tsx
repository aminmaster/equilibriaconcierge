import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const TestEdgeFunction = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const testHelloFunction = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Call the hello function
      const response = await fetch('https://jmxemujffofqpqrxajlb.supabase.co/functions/v1/hello', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ name: 'Test User' })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data);
      toast({
        title: "Success",
        description: "Hello function test completed successfully",
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: `Failed to test hello function: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testChatFunction = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Create a test conversation first
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .insert([{ title: 'Test Conversation' }])
        .select()
        .single();
      
      if (conversationError) throw conversationError;
      
      // Call the chat function
      const response = await fetch('https://jmxemujffofqpqrxajlb.supabase.co/functions/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ 
          message: 'Hello, this is a test message', 
          conversationId: conversationData.id,
          embeddingModel: 'text-embedding-3-large',
          generationProvider: 'openrouter',
          generationModel: 'openai/gpt-4o'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      setResult(data);
      toast({
        title: "Success",
        description: "Chat function test completed successfully",
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: `Failed to test chat function: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Edge Function Tests</h2>
      
      <div className="flex gap-2">
        <button 
          onClick={testHelloFunction} 
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Hello Function'}
        </button>
        
        <button 
          onClick={testChatFunction} 
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Chat Function'}
        </button>
      </div>
      
      {error && <div className="p-3 bg-red-100 text-red-800 rounded">Error: {error}</div>}
      {result && <pre className="p-3 bg-gray-100 rounded overflow-auto max-h-60">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
};