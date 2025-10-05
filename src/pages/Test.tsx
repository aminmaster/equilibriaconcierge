import { TestSupabase } from "@/components/test-supabase";
import { TestEdgeFunction } from "@/components/test-edge-function";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export default function Test() {
  const { user, signIn, signUp, signOut } = useAuth();
  
  // ONLY FOR TESTING - Remove this useEffect after setting your admin role
  useEffect(() => {
    const makeAdmin = async () => {
      if (user && user.email === "your-email@example.com") { // Replace with your email
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);
          
          if (error) {
            console.error("Error making admin:", error);
          } else {
            console.log("Successfully made admin!");
          }
        } catch (error) {
          console.error("Error:", error);
        }
      }
    };
    
    makeAdmin();
  }, [user]);
  
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">System Tests</h1>
        
        <div className="space-y-8">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Test</h2>
            {user ? (
              <div>
                <p>Logged in as: {user.name} ({user.email})</p>
                <p>Role: {user.role}</p>
                <button 
                  onClick={() => signOut()}
                  className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <p>Not logged in</p>
            )}
          </div>
          
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Supabase Integration Test</h2>
            <TestSupabase />
          </div>
          
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Edge Function Test</h2>
            <TestEdgeFunction />
          </div>
        </div>
      </div>
    </div>
  );
}