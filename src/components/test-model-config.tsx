import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const TestModelConfig = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModelConfig = async () => {
      try {
        console.log("Fetching model configurations...");
        const { data, error } = await supabase
          .from('model_configurations')
          .select('*');
        
        console.log("Raw data:", data);
        console.log("Raw error:", error);
        
        if (error) {
          throw error;
        }
        
        setData(data);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchModelConfig();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Model Configurations</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};