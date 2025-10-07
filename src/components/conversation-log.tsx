"use client";

import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  Edit, 
  MoreHorizontal,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/use-conversations";
import { MarkdownRenderer } from "@/components/markdown-renderer";

export function ConversationLog() {
  const { currentConversation, loading } = useConversations();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [streamingMessage, setStreamingMessage] = useState<{id: string, content: string} | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [currentConversation?.messages, streamingMessage]);

  const handleFeedback = (messageId: string, type: string) => {
    setFeedback(prev => ({
      ...prev,
      [messageId]: type
    }));
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b flex-shrink-0">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 p-3 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex-shrink-0">
        <h2 className="text-lg font-semibold">Conversation</h2>
        <p className="text-xs text-muted-foreground">
          {currentConversation?.messages.length || 0} messages
        </p>
      </div>
      
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-3">
          {!currentConversation || currentConversation.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="bg-muted rounded-full p-3 mb-3">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No messages yet</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Start a conversation by sending a message
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-3">
              {currentConversation.messages.map((message) => (
                <div 
                  key={message.id} 
                  className={cn(
                    "flex gap-2",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-[0.6rem] font-bold text-primary-foreground">AI</span>
                    </div>
                  )}
                  
                  <div className={cn(
                    "rounded-xl px-3 py-2 break-words",
                    "max-w-[calc(100%-2rem)] md:max-w-[85%] lg:max-w-[80%]",
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-md" 
                      : "bg-muted rounded-tl-md"
                  )}>
                    <MarkdownRenderer content={message.content} />
                    
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-0.5 mt-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleFeedback(message.id, "up")}
                        >
                          <ThumbsUp 
                            className={cn(
                              "h-3 w-3",
                              feedback[message.id] === "up" && "text-green-500"
                            )} 
                          />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleFeedback(message.id, "down")}
                        >
                          <ThumbsDown 
                            className={cn(
                              "h-3 w-3",
                              feedback[message.id] === "down" && "text-red-500"
                          )} 
                        />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {message.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-[0.6rem] font-bold">U</span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Streaming message placeholder */}
            {streamingMessage && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-[0.6rem] font-bold text-primary-foreground">AI</span>
                </div>
                <div className="rounded-xl px-3 py-2 break-words bg-muted rounded-tl-md max-w-[calc(100%-2rem)] md:max-w-[85%] lg:max-w-[80%]">
                  <MarkdownRenderer content={streamingMessage.content} />
                  <div className="inline-block ml-1 w-2 h-4 bg-muted-foreground align-middle animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  </div>
);
}