import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const TestSupabase = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Test fetching profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .limit(1);
        
        if (error) throw error;
        
        setData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Supabase Test</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};