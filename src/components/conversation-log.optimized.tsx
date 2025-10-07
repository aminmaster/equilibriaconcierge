"use client";

import { useState, useEffect, useRef, memo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  Edit, 
  MoreHorizontal,
  MessageCircle,
  GitBranch,
  Save,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/use-conversations";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Textarea } from "@/components/ui/textarea";
import { Virtuoso } from 'react-virtuoso';

// Memoized message component to prevent unnecessary re-renders
const MessageItem = memo(({ 
  message, 
  index, 
  isLast,
  onFeedback,
  onEdit,
  onBranch,
  feedback
}: {
  message: any;
  index: number;
  isLast: boolean;
  onFeedback: (messageId: string, type: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onBranch: (messageIndex: number) => void;
  feedback: Record<string, string>;
}) => {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  
  const startEditing = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const saveEdit = async () => {
    if (editingMessageId && editContent.trim()) {
      try {
        await onEdit(editingMessageId, editContent.trim());
        setEditingMessageId(null);
        setEditContent("");
      } catch (error) {
        console.error("Error saving edit:", error);
      }
    }
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  if (editingMessageId === message.id) {
    return (
      <div className={cn(
        "flex gap-2",
        message.role === "user" ? "justify-end" : "justify-start"
      )}>
        {message.role === "assistant" && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-[0.6rem] font-bold text-primary-foreground">AI</span>
          </div>
        )}
        
        <div className="flex-1">
          <div className="bg-muted rounded-xl p-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[100px] mb-2"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={cancelEdit}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={saveEdit}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {message.role === "user" && (
          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-[0.6rem] font-bold">U</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
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
      
      <div className="flex-1">
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
                onClick={() => onFeedback(message.id, "up")}
                aria-label="Thumbs up"
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
                onClick={() => onFeedback(message.id, "down")}
                aria-label="Thumbs down"
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
                onClick={() => startEditing(message.id, message.content)}
                aria-label="Edit message"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => onBranch(index)}
                aria-label="Branch conversation"
              >
                <GitBranch className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                aria-label="More options"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {message.role === "user" && (
        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-[0.6rem] font-bold">U</span>
        </div>
      )}
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export function ConversationLog() {
  const { currentConversation, loading } = useConversations();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [streamingMessage, setStreamingMessage] = useState<{id: string, content: string} | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<any>(null);

  const handleFeedback = useCallback((messageId: string, type: string) => {
    setFeedback(prev => ({
      ...prev,
      [messageId]: type
    }));
  }, []);

  const handleEdit = useCallback(async (messageId: string, newContent: string) => {
    // In a real implementation, this would call the editMessage function from useConversations
    console.log("Editing message:", messageId, newContent);
  }, []);

  const handleBranchConversation = useCallback(async (messageIndex: number) => {
    // In a real implementation, this would call the branchConversation function from useConversations
    console.log("Branching at message index:", messageIndex);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (virtuosoRef.current && (currentConversation?.messages.length || 0) > 0) {
      virtuosoRef.current.scrollToIndex({
        index: (currentConversation?.messages.length || 0) - 1,
        behavior: 'smooth'
      });
    }
  }, [currentConversation?.messages]);

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
      
      {(!currentConversation || currentConversation.messages.length === 0) && !streamingMessage ? (
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
        <Virtuoso
          ref={virtuosoRef}
          data={currentConversation?.messages || []}
          itemContent={(index, message) => (
            <MessageItem
              message={message}
              index={index}
              isLast={index === (currentConversation?.messages.length || 0) - 1}
              onFeedback={handleFeedback}
              onEdit={handleEdit}
              onBranch={handleBranchConversation}
              feedback={feedback}
            />
          )}
          className="flex-1"
          followOutput={true}
        />
      )}
      
      {/* Streaming message placeholder */}
      {streamingMessage && (
        <div className="flex gap-2 justify-start p-3">
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
  );
}