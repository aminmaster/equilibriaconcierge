"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  User, 
  Palette, 
  Shield, 
  Bell, 
  Trash2,
  Chrome,
  Github,
  Settings,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ProfileTab } from "@/components/account/ProfileTab";
import { PreferencesTab } from "@/components/account/PreferencesTab";
import { AppearanceTab } from "@/components/account/AppearanceTab";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { SecurityTab } from "@/components/account/SecurityTab";

export default function Account() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message || "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(user!.id);
      if (error) throw error;
      
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      await signOut();
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete account.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Account Access Required</CardTitle>
            <CardDescription>
              Please log in to access your account settings.
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile, preferences, and security settings
            </p>
          </div>
          <div className="flex gap-2">
            {user?.role === 'admin' && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin')}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Admin Panel
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <Button
                    variant={activeTab === "profile" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("profile")}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Button>
                  <Button
                    variant={activeTab === "preferences" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("preferences")}
                  >
                    <Bell className="h-4 w-4" />
                    Preferences
                  </Button>
                  <Button
                    variant={activeTab === "appearance" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("appearance")}
                  >
                    <Palette className="h-4 w-4" />
                    Appearance
                  </Button>
                  <Button
                    variant={activeTab === "analytics" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("analytics")}
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Button>
                  <Button
                    variant={activeTab === "security" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("security")}
                  >
                    <Shield className="h-4 w-4" />
                    Security
                  </Button>
                </nav>
                
                <div className="mt-8 pt-4 border-t">
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {activeTab === "profile" && <ProfileTab user={user} />}
            {activeTab === "preferences" && <PreferencesTab />}
            {activeTab === "appearance" && <AppearanceTab />}
            {activeTab === "analytics" && <AnalyticsDashboard />}
            {activeTab === "security" && <SecurityTab user={user} />}
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}