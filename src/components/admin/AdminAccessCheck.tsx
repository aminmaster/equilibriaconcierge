"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface AdminAccessCheckProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export function AdminAccessCheck({ user }: AdminAccessCheckProps) {
  const { signOut } = useAuth();
  
  return (
    <div className="min-h-screen py-8 flex items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access the admin dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Current User:</p>
              <p className="font-medium">{user.name || user.email}</p>
              <p className="text-sm text-muted-foreground">Role: {user.role}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Only users with the admin role can access this page. 
              Contact your system administrator if you believe this is an error.
            </p>
            <Button 
              className="w-full"
              onClick={() => window.location.assign('/')}
            >
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}