"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mic, 
  Keyboard, 
  Settings, 
  Send,
  Square,
  AlertCircle
} from "lucide-react";
import { SoundSettingsPanel } from "@/components/sound-settings-panel";
import { useChat } from "@/hooks/use-chat";
import { useConversations } from "@/hooks/use-conversations";
import { useNavigate } from "react-router-dom";

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
  const { currentConversation } = useConversations();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    try {
      await streamMessage(message, (chunk: string) => {
        // This callback handles streaming chunks
        console.log("Received chunk:", chunk);
      });
      setMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const toggleListening = () => {
    setIsListening(!isListening);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Reset form when conversation changes
  useEffect(() => {
    if (!currentConversation) {
      setMessage("");
    }
  }, [currentConversation]);

  // Check if error is related to missing model configurations
  const isModelConfigError = error?.includes("model configurations") || error?.includes("configure models");

  return (
    <div className="bg-background/80 backdrop-blur-sm border-t">
      <div className="p-2">
        <div className="relative rounded-lg bg-background/40 border shadow-sm p-2">
          {inputMode === "text" ? (
            <form onSubmit={handleSubmit} className="flex gap-1 items-end">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="min-h-10 h-10 flex-1 resize-none shadow-sm py-2 text-sm"
                disabled={isLoading}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                aria-label="Type your message"
              />
              
              <div className="flex gap-1">
                {isLoading ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-10 w-10"
                    onClick={cancelStream}
                    aria-label="Cancel message"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      size="icon"
                      className="h-10 w-10"
                      disabled={!message.trim() || isLoading}
                      aria-label="Send message"
                      variant={message.trim() ? "default" : "secondary"}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setInputMode("voice")}
                      className="h-10 w-10"
                      aria-label="Switch to voice input"
                      disabled={isLoading}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-center gap-1 h-5">
                  {[...Array(15)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-primary rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 15 + 3}px`,
                        animationDelay: `${i * 0.1}s`
                      }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-1">
                  {isListening ? "Listening..." : "Click microphone to speak"}
                </p>
              </div>
              
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant={isListening ? "destructive" : "default"}
                  onClick={toggleListening}
                  className="h-10 w-10"
                  aria-label={isListening ? "Stop listening" : "Start listening"}
                  disabled={isLoading}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setInputMode("text")}
                  className="h-10 w-10"
                  aria-label="Switch to text input"
                  disabled={isLoading}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
                
                {isLoading && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-10 w-10"
                    onClick={cancelStream}
                    aria-label="Cancel message"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive" role="alert">
              <div className="flex items-start gap-1">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>Error: {error}</p>
                  {isModelConfigError && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs text-destructive underline"
                      onClick={() => navigate("/admin")}
                      aria-label="Configure models in admin panel"
                    >
                      Configure models in admin panel
                    </Button>
                  )}
                </div>
              </div>
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