"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, isListening, setIsListening, disabled = false }: VoiceInputProps) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check browser support for SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      setIsSupported(true);
      
      // Configure recognition
      recognitionRef.current.continuous = true; // Allow multi-sentence input
      recognitionRef.current.interimResults = true; // Show partial results
      recognitionRef.current.lang = 'en-US'; // Default language; could be dynamic
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        onTranscript(transcript);
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Voice Input Error",
          description: `Recognition failed: ${event.error}. Please try again.`,
          variant: "destructive",
        });
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setIsSupported(false);
      toast({
        title: "Voice Input Not Supported",
        description: "Your browser doesn't support voice input. Please use text mode.",
        variant: "destructive",
      });
    }
  }, [onTranscript, setIsListening, toast]);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  if (!isSupported) {
    return (
      <Button
        size="icon"
        variant="outline"
        disabled={true}
        className="h-10 w-10"
        title="Voice input not supported in this browser"
      >
        <MicOff className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      size="icon"
      variant={isListening ? "destructive" : "default"}
      onClick={toggleListening}
      className="h-10 w-10"
      disabled={disabled}
      title={isListening ? "Stop listening" : "Start voice input"}
    >
      {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}