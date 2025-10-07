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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function AppearanceTab() {
  const { toast } = useToast();
  const [appearance, setAppearance] = useState({
    theme: "system",
    fontSize: "medium",
  });

  const handleSaveAppearance = () => {
    toast({
      title: "Appearance updated",
      description: "Your appearance settings have been saved.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the look and feel of the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Theme</Label>
          <Select 
            value={appearance.theme}
            onValueChange={(value: string) => 
              setAppearance({...appearance, theme: value})
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Font Size</Label>
          <Select 
            value={appearance.fontSize}
            onValueChange={(value: string) => 
              setAppearance({...appearance, fontSize: value})
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select font size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleSaveAppearance}>Save Appearance</Button>
        </div>
      </CardContent>
    </Card>
  );
}