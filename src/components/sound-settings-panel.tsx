"use client";

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

  const resetToDefaults = () => {
    setVolume([80]);
    setSoundEnabled(true);
    setVoiceFeedback(true);
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
              <Label>Sound Effects</Label>
              <p className="text-sm text-muted-foreground">
                Enable UI sound effects
              </p>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Volume</Label>
              <span className="text-sm text-muted-foreground w-12 text-right">
                {volume[0]}%
              </span>
            </div>
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Voice Feedback</Label>
              <p className="text-sm text-muted-foreground">
                AI responses spoken aloud
              </p>
            </div>
            <Switch
              checked={voiceFeedback}
              onCheckedChange={setVoiceFeedback}
            />
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}