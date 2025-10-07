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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function PreferencesTab() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    notifications: true,
    newsletter: false,
    language: "en",
  });

  const handleSavePreferences = () => {
    toast({
      title: "Preferences saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Manage your notification and communication preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications about your conversations
            </p>
          </div>
          <Switch
            checked={preferences.notifications}
            onCheckedChange={(checked: boolean) => 
              setPreferences({...preferences, notifications: checked})
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Newsletter</Label>
            <p className="text-sm text-muted-foreground">
              Receive product updates and news
            </p>
          </div>
          <Switch
            checked={preferences.newsletter}
            onCheckedChange={(checked: boolean) => 
              setPreferences({...preferences, newsletter: checked})
            }
          />
        </div>
        
        <div className="space-y-2">
          <Label>Language</Label>
          <Select 
            value={preferences.language}
            onValueChange={(value: string) => 
              setPreferences({...preferences, language: value})
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleSavePreferences}>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}