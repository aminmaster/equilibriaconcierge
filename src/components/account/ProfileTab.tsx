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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface ProfileTabProps {
  user: any;
}

export function ProfileTab({ user }: ProfileTabProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);

  // Load user profile
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: user.email || "",
          bio: data.bio || "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          bio: profile.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information and bio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 rounded-full border-2 border-current border-t-transparent animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your personal information and bio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xl font-bold text-primary-foreground">
              {profile.first_name?.charAt(0) || user?.name?.charAt(0) || "U"}
            </span>
          </div>
          <div>
            <Button variant="outline">Change Avatar</Button>
            <p className="text-sm text-muted-foreground mt-1">
              JPG, GIF or PNG. 1MB max.
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input
                id="first-name"
                value={profile.first_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({...profile, first_name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                value={profile.last_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({...profile, last_name: e.target.value})}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({...profile, email: e.target.value})}
              disabled
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself"
              value={profile.bio}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProfile({...profile, bio: e.target.value})}
              className="min-h-[120px]"
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleSaveProfile}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
}