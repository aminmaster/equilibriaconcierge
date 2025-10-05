import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const TestEdgeFunction = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Edge Function Test</h2>
      <button onClick={testHelloFunction} disabled={loading}>
        {loading ? 'Testing...' : 'Test Hello Function'}
      </button>
      
      {error && <div>Error: {error}</div>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
};