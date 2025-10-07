"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth.tsx"; // Updated import
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  Key, 
  Settings,
  Bug,
  LogOut,
  User,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { KnowledgeBaseTab } from "@/components/admin/KnowledgeBaseTab";
import { ApiKeysTab } from "@/components/admin/ApiKeysTab";
import { ModelConfigTab } from "@/components/admin/ModelConfigTab";
import { AdminAccessCheck } from "@/components/admin/AdminAccessCheck";
import { TestApiKey } from "@/components/admin/TestApiKey";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Admin() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("knowledge");
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [hasModelConfigs, setHasModelConfigs] = useState(false);

  // Check if user is admin and check for existing configurations
  useEffect(() => {
    const checkAdminAndConfigs = async () => {
      if (user?.role === 'admin') {
        setIsAdmin(true);
        
        // Check for API keys
        const { data: apiKeysData, error: apiKeysError } = await supabase
          .from('api_keys')
          .select('id');
        
        if (!apiKeysError && apiKeysData && apiKeysData.length > 0) {
          setHasApiKeys(true);
        }
        
        // Check for model configurations
        const { data: modelConfigsData, error: modelConfigsError } = await supabase
          .from('model_configurations')
          .select('id');
        
        if (!modelConfigsError && modelConfigsData && modelConfigsData.length > 0) {
          setHasModelConfigs(true);
        }
      }
    };
    
    checkAdminAndConfigs();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message || "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not admin, show access denied message
  if (!isAdmin && user) {
    return <AdminAccessCheck user={user} />;
  }

  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              Please log in to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.assign('/auth')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage knowledge bases, API keys, and system configuration
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/account')}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              My Profile
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Setup Guide for First-Time Users */}
        {(!hasApiKeys || !hasModelConfigs) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Setup Required
              </CardTitle>
              <CardDescription>
                Complete the following steps to get your AI platform running
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {hasApiKeys ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <h3 className="font-medium">Add API Keys</h3>
                    <p className="text-sm text-muted-foreground">
                      Add your OpenAI or OpenRouter API keys to enable AI functionality
                    </p>
                  </div>
                  {!hasApiKeys && (
                    <Button 
                      size="sm" 
                      onClick={() => setActiveTab("api")}
                      variant="outline"
                    >
                      Configure
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {hasModelConfigs ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <h3 className="font-medium">Configure Models</h3>
                    <p className="text-sm text-muted-foreground">
                      Set up the AI models for generation and embedding
                    </p>
                  </div>
                  {!hasModelConfigs && (
                    <Button 
                      size="sm" 
                      onClick={() => setActiveTab("model")}
                      variant="outline"
                    >
                      Configure
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <Button
                    variant={activeTab === "knowledge" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("knowledge")}
                  >
                    <Database className="h-4 w-4" />
                    Knowledge Base
                  </Button>
                  <Button
                    variant={activeTab === "api" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("api")}
                  >
                    <Key className="h-4 w-4" />
                    API Keys
                  </Button>
                  <Button
                    variant={activeTab === "model" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("model")}
                  >
                    <Settings className="h-4 w-4" />
                    Model Config
                  </Button>
                  <Button
                    variant={activeTab === "test" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("test")}
                  >
                    <Bug className="h-4 w-4" />
                    Test API Key
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {activeTab === "knowledge" && <KnowledgeBaseTab />}
            {activeTab === "api" && <ApiKeysTab />}
            {activeTab === "model" && <ModelConfigTab />}
            {activeTab === "test" && <TestApiKey />}
          </div>
        </div>
      </div>
    </div>
  );
}