import { useState, useEffect } from "react";

// Mock user type - in a real app this would come from Supabase
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock authentication logic - in a real app this would interact with Supabase
  useEffect(() => {
    const checkAuth = async () => {
      // Simulate API call
      setTimeout(() => {
        // Check if we have a user in localStorage (mock)
        const mockUser = localStorage.getItem("mockUser");
        if (mockUser) {
          setUser(JSON.parse(mockUser));
        }
        setLoading(false);
      }, 500);
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    // Mock sign in
    const mockUser = {
      id: "1",
      email,
      name: "Demo User",
      role: "user"
    };
    
    localStorage.setItem("mockUser", JSON.stringify(mockUser));
    setUser(mockUser);
    return { user: mockUser, error: null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    // Mock sign up
    const mockUser = {
      id: "1",
      email,
      name,
      role: "user"
    };
    
    localStorage.setItem("mockUser", JSON.stringify(mockUser));
    setUser(mockUser);
    return { user: mockUser, error: null };
  };

  const signOut = async () => {
    localStorage.removeItem("mockUser");
    setUser(null);
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut
  };
}