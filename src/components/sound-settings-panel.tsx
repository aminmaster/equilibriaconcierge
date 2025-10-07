"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface SoundSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SoundSettingsPanel({ open, onOpenChange }: SoundSettingsPanelProps) {
  const [volume, setVolume] = useState([80]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceFeedback, setVoiceFeedback] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedVolume = localStorage.getItem('soundVolume');
    const savedSoundEnabled = localStorage.getItem('soundEnabled');
    const savedVoiceFeedback = localStorage.getItem('voiceFeedback');
    
    if (savedVolume) {
      setVolume([parseInt(savedVolume)]);
    }
    
    if (savedSoundEnabled) {
      setSoundEnabled(savedSoundEnabled === 'true');
    }
    
    if (savedVoiceFeedback) {
      setVoiceFeedback(savedVoiceFeedback === 'true');
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('soundVolume', volume[0].toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('soundEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('voiceFeedback', voiceFeedback.toString());
  }, [voiceFeedback]);

  const resetToDefaults = () => {
    setVolume([80]);
    setSoundEnabled(true);
    setVoiceFeedback(true);
  };

  const handleSave = () => {
    // In a real implementation, you might want to dispatch an event or call a context function
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sound Settings</DialogTitle>
          <DialogDescription>
            Adjust audio preferences for your conversations
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sound-enabled">Sound Effects</Label>
              <p className="text-sm text-muted-foreground">
                Enable UI sound effects
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
              aria-label="Toggle sound effects"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="volume-slider">Volume</Label>
              <span className="text-sm text-muted-foreground w-12 text-right" aria-live="polite">
                {volume[0]}%
              </span>
            </div>
            <Slider
              id="volume-slider"
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="w-full"
              aria-label="Adjust volume"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="voice-feedback">Voice Feedback</Label>
              <p className="text-sm text-muted-foreground">
                AI responses spoken aloud
              </p>
            </div>
            <Switch
              id="voice-feedback"
              checked={voiceFeedback}
              onCheckedChange={setVoiceFeedback}
              aria-label="Toggle voice feedback"
            />
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="gap-2"
            aria-label="Reset to default settings"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} aria-label="Save sound preferences">
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}