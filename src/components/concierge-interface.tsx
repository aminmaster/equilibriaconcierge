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
    <div className="bg-background/80 backdrop-blur-sm border-t"> {/* Reduced backdrop blur */}
      <div className="p-2"> {/* Reduced padding */}
        {/* Glassmorphism panel */}
        <div className="relative rounded-lg bg-background/40 border shadow-sm p-2"> {/* Reduced padding and border */}
          {inputMode === "text" ? (
            <form onSubmit={handleSubmit} className="flex gap-1 items-end"> {/* Reduced gap */}
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="min-h-10 h-10 flex-1 resize-none shadow-sm py-2 text-sm" {/* Reduced height and padding */}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              
              <div className="flex gap-1"> {/* Reduced gap */}
                {isLoading ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-10 w-10" {/* Reduced button size */}
                    onClick={cancelStream}
                    aria-label="Cancel message"
                  >
                    <Square className="h-4 w-4" /> {/* Reduced icon size */}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      size="icon"
                      className="h-10 w-10" {/* Reduced button size */}
                      disabled={!message.trim() || isLoading}
                      aria-label="Send message"
                      variant={message.trim() ? "default" : "secondary"}
                    >
                      <Send className="h-4 w-4" /> {/* Reduced icon size */}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setInputMode("voice")}
                      className="h-10 w-10" {/* Reduced button size */}
                      aria-label="Switch to voice input"
                      disabled={isLoading}
                    >
                      <Mic className="h-4 w-4" /> {/* Reduced icon size */}
                    </Button>
                  </>
                )}
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2"> {/* Reduced gap */}
              <div className="flex-1">
                <div className="flex justify-center gap-1 h-5"> {/* Reduced height */}
                  {[...Array(15)].map((_, i) => ( {/* Reduced number of bars */}
                    <div 
                      key={i} 
                      className="w-1 bg-primary rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 15 + 3}px`, {/* Reduced height range */}
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-1"> {/* Reduced text size */}
                  {isListening ? "Listening..." : "Click microphone to speak"}
                </p>
              </div>
              
              <div className="flex gap-1"> {/* Reduced gap */}
                <Button
                  size="icon"
                  variant={isListening ? "destructive" : "default"}
                  onClick={toggleListening}
                  className="h-10 w-10" {/* Reduced button size */}
                  aria-label={isListening ? "Stop listening" : "Start listening"}
                  disabled={isLoading}
                >
                  <Mic className="h-4 w-4" /> {/* Reduced icon size */}
                </Button>
                
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setInputMode("text")}
                  className="h-10 w-10" {/* Reduced button size */}
                  aria-label="Switch to text input"
                  disabled={isLoading}
                >
                  <Keyboard className="h-4 w-4" /> {/* Reduced icon size */}
                </Button>
                
                {isLoading && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-10 w-10" {/* Reduced button size */}
                    onClick={cancelStream}
                    aria-label="Cancel message"
                  >
                    <Square className="h-4 w-4" /> {/* Reduced icon size */}
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-1 text-xs text-destructive"> {/* Reduced margin and text size */}
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