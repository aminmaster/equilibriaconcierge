"use client";

import { useState } from "react";
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

export function ConversationLog() {
  const { currentConversation, loading } = useConversations();
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const handleFeedback = (messageId: string, type: string) => {
    setFeedback(prev => ({
      ...prev,
      [messageId]: type
    }));
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Conversation</h2>
        <p className="text-sm text-muted-foreground">
          {currentConversation?.messages.length || 0} messages
        </p>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {!currentConversation || currentConversation.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="bg-muted rounded-full p-4 mb-4">
              <MessageCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a conversation by sending a message
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {currentConversation.messages.map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">AI</span>
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  message.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-muted rounded-tl-none"
                )}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleFeedback(message.id, "up")}
                      >
                        <ThumbsUp 
                          className={cn(
                            "h-4 w-4",
                            feedback[message.id] === "up" && "text-green-500"
                          )} 
                        />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleFeedback(message.id, "down")}
                      >
                        <ThumbsDown 
                          className={cn(
                            "h-4 w-4",
                            feedback[message.id] === "down" && "text-red-500"
                          )} 
                        />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-xs font-bold">U</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}