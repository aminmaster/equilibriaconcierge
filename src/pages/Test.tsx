import { TestSupabase } from "@/components/test-supabase";
import { TestEdgeFunction } from "@/components/test-edge-function";
import { useAuth } from "@/hooks/use-auth";

export default function Test() {
  const { user, signIn, signUp, signOut } = useAuth();
  
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