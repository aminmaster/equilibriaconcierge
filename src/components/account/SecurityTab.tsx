"use client";

import { useState } from "react";
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
import {
  Chrome,
  Github
} from "lucide-react";

interface SecurityTabProps {
  user: any;
}

export function SecurityTab({ user }: SecurityTabProps) {
  const { toast } = useToast();
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSaveSecurity = () => {
    if (security.newPassword !== security.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Password updated",
      description: "Your password has been changed successfully.",
    });
    
    setSecurity({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Manage your password and security settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={security.currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setSecurity({...security, currentPassword: e.target.value})
              }
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={security.newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setSecurity({...security, newPassword: e.target.value})
              }
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={security.confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setSecurity({...security, confirmPassword: e.target.value})
              }
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleSaveSecurity}>Update Password</Button>
        </div>
        
        <div className="pt-6 border-t">
          <h3 className="font-medium mb-2">Connected Accounts</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Chrome className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium">Google</p>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Disconnect</Button>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                  <Github className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium">GitHub</p>
                  <p className="text-sm text-muted-foreground">Not connected</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Connect</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}