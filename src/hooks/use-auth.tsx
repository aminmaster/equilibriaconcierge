import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Define user type
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

// Define the context value type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

// Create context with initial value
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
              role: profile.role || 'user',
              first_name: profile.first_name || '',
              last_name: profile.last_name || ''
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
                role: profile.role || 'user',
                first_name: profile.first_name || '',
                last_name: profile.last_name || ''
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
    try {
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
            role: profile.role || 'user',
            first_name: profile.first_name || '',
            last_name: profile.last_name || ''
          });
        }
      }
      
      return result;
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const result = await supabase.auth.signUp({
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
      
      if (result.data?.user) {
        setUser({
          id: result.data.user.id,
          email: result.data.user.email || '',
          name: name,
          role: 'user',
          first_name: firstName,
          last_name: lastName
        });
      }
      
      return result;
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "There was an error creating your account.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({
        title: "Sign out failed",
        description: error.message || "Failed to sign out.",
        variant: "destructive",
      });
      // Even if there's an error, clear the user state
      setUser(null);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: updates.first_name,
          last_name: updates.last_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUser({
        ...user,
        ...updates,
        name: `${updates.first_name || user.first_name || ''} ${updates.last_name || user.last_name || ''}`.trim() || user.name
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};