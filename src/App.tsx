import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import Index from "./pages/Index";
import Concierge from "./pages/Concierge";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Test from "./pages/Test";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "@/components/protected-route";

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/concierge" element={<Concierge />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/test" element={<Test />} />
          <Route 
            path="/account" 
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </AuthProvider>
);

export default App;