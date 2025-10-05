"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
];

interface LanguagePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LanguagePanel({ open, onOpenChange }: LanguagePanelProps) {
  const currentLanguage = "en"; // In a real app, this would come from context/state

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Language</DialogTitle>
          <DialogDescription>
            Select your preferred language
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72">
          <div className="space-y-2">
            {LANGUAGES.map((language) => (
              <Button
                key={language.code}
                variant={currentLanguage === language.code ? "default" : "ghost"}
                className="w-full justify-between"
                onClick={() => {
                  // In a real app, this would set the language
                  onOpenChange(false);
                }}
              >
                <span>{language.name}</span>
                <span className="text-muted-foreground">{language.native}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}