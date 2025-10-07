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
  AlertCircle,
  GitBranch,
  Loader2
} from "lucide-react";
import { SoundSettingsPanel } from "@/components/sound-settings-panel";
import { useChat } from "@/hooks/use-chat";
import { useConversations } from "@/hooks/use-conversations";
import { useNavigate } from "react-router-dom";
import { VoiceInput } from "@/components/voice-input";

interface ConciergeInterfaceProps {
  inputMode: "text" | "voice";
  setInputMode: (mode: "text" | "voice") => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  message: string;
  setMessage: (message: string) => void;
}

export function ConciergeInterface({ 
  inputMode, 
  setInputMode, 
  isListening, 
  setIsListening,
  message, 
  setMessage 
}: ConciergeInterfaceProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { streamMessage, cancelStream, isLoading, error, configLoading } = useChat();
  const { currentConversation } = useConversations();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading || configLoading) return;
    
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

  // Handle voice transcription
  const handleTranscript = (transcript: string) => {
    setMessage(prev => prev + ' ' + transcript.trim());
  };

  return (
    <div className="bg-background/80 backdrop-blur-sm border-t">
      <div className="p-2">
        <div className="relative rounded-lg bg-background/40 border shadow-sm p-2">
          {configLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading model configuration...</span>
            </div>
          ) : inputMode === "text" ? (
            <form onSubmit={handleSubmit} className="flex gap-1 items-end">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="min-h-10 h-10 flex-1 resize-none shadow-sm py-2 text-sm"
                disabled={isLoading || configLoading}
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
                      disabled={!message.trim() || isLoading || configLoading}
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
                      disabled={isLoading || configLoading}
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
                <VoiceInput
                  onTranscript={handleTranscript}
                  isListening={isListening}
                  setIsListening={setIsListening}
                  disabled={isLoading || configLoading}
                />
                
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setInputMode("text")}
                  className="h-10 w-10"
                  aria-label="Switch to text input"
                  disabled={isLoading || configLoading}
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
            <div className="mt-2 p-3 bg-destructive/10 rounded text-sm text-destructive border border-destructive/20" role="alert">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="mt-1">{error}</p>
                  {isModelConfigError && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs text-destructive underline mt-1"
                      onClick={() => navigate("/admin")}
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