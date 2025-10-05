"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If not loading and no user, redirect to auth
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    
    // If admin role is required but user doesn't have it, redirect to home
    if (requiredRole === "admin" && !loading && user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, loading, navigate, requiredRole]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, don't render anything (will redirect)
  if (!user) {
    return null;
  }

  // If admin role is required but user doesn't have it
  if (requiredRole === "admin" && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <Button onClick={() => navigate("/")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}