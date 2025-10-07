export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  signOut: () => Promise<void>;
}