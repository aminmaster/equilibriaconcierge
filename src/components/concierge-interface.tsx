"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mic, 
  Keyboard, 
  Settings, 
  Send,
  Square
} from "lucide-react";
import { SoundSettingsPanel } from "@/components/sound-settings-panel";
import { useChat } from "@/hooks/use-chat";

interface ConciergeInterfaceProps {
  inputMode: "text" | "voice";
  setInputMode: (mode: "text" | "voice") => void;
}

export function ConciergeInterface({ inputMode, setInputMode }: ConciergeInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { streamMessage, cancelStream, isLoading, error } = useChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    try {
      // We still stream the message but don't need to capture the chunks here
      // The conversation log will handle displaying the response
      await streamMessage(message, () => {
        // We don't need to do anything with the chunks here
        // The conversation log will automatically update
      });
      setMessage(""); // Only reset the message input
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    // In a real app, this would start/stop speech recognition
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t">
      <div className="max-w-4xl mx-auto p-4">
        {/* Glassmorphism panel */}
        <div className="relative rounded-2xl bg-background/50 border shadow-lg p-4">
          {inputMode === "text" ? (
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="min-h-[60px] flex-1 resize-none shadow-sm"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setInputMode("voice")}
                  className="h-12 w-12"
                  aria-label="Switch to voice input"
                  disabled={isLoading}
                >
                  <Mic className="h-5 w-5" />
                </Button>
                
                {isLoading ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-12 w-12"
                    onClick={cancelStream}
                    aria-label="Cancel message"
                  >
                    <Square className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    className="h-12 w-12"
                    disabled={!message.trim() || isLoading}
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-center gap-1 h-6">
                  {[...Array(20)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-primary rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 20 + 5}px`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {isListening ? "Listening..." : "Click microphone to speak"}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant={isListening ? "destructive" : "default"}
                  onClick={toggleListening}
                  className="h-12 w-12"
                  aria-label={isListening ? "Stop listening" : "Start listening"}
                  disabled={isLoading}
                >
                  <Mic className="h-5 w-5" />
                </Button>
                
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setInputMode("text")}
                  className="h-12 w-12"
                  aria-label="Switch to text input"
                  disabled={isLoading}
                >
                  <Keyboard className="h-5 w-5" />
                </Button>
                
                {isLoading && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-12 w-12"
                    onClick={cancelStream}
                    aria-label="Cancel message"
                  >
                    <Square className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-2 text-sm text-destructive">
              Error: {error}
            </div>
          )}
        </div>
      </div>
      
      <SoundSettingsPanel 
        open={showSettings} 
        onOpenChange={setShowSettings} 
      />
    </div>
  );
}