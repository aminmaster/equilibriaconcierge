import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";

// Define user type
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Define the context value type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  signOut: () => Promise<void>;
}

// Create context with initial value
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Check active session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          // Get user profile
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!error && mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User',
              role: profile.role || 'user'
            });
          } else if (mounted) {
            // If profile doesn't exist, create a minimal user object
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.email?.split('@')[0] || 'User',
              role: 'user'
            });
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      if (session) {
        // Get user profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (!mounted) return;
            
            if (!error) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User',
                role: profile.role || 'user'
              });
            } else {
              // If profile doesn't exist, create a minimal user object
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.email?.split('@')[0] || 'User',
                role: 'user'
              });
            }
            setLoading(false);
          });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    
    // If successful, get user profile
    if (result.data?.session) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', result.data.session.user.id)
        .single();
      
      if (!error) {
        setUser({
          id: result.data.session.user.id,
          email: result.data.session.user.email || '',
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User',
          role: profile.role || 'user'
        });
      }
    }
    
    return result;
  };

  const signUp = async (email: string, password: string, name: string) => {
    // Split name into first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'user' // Default role is user
        }
      }
    });
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      // Even if there's an error, clear the user state
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};