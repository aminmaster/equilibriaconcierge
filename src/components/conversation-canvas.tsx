"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Share, 
  Download, 
  Maximize2, 
  Minimize2,
  Loader2
} from "lucide-react";
import { ShareConversation } from "@/components/share-conversation";
import { useConversations } from "@/hooks/use-conversations";

export function ConversationCanvas() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { currentConversation, loading } = useConversations();

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b flex justify-between items-center flex-shrink-0">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex gap-1">
            <div className="h-7 w-7 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-7 w-7 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-1">
          <div className="text-center">
            <div className="bg-muted rounded-full p-3 inline-block mb-2 animate-pulse">
              <div className="grid grid-cols-3 gap-1 w-12 h-12">
                {[...Array(9)].map((_, i) => (
                  <div 
                    key={i} 
                    className="bg-primary/20 rounded-sm"
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
            <div className="h-4 w-32 bg-gray-200 rounded mb-2 mx-auto animate-pulse"></div>
            <div className="h-3 w-48 bg-gray-200 rounded mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b flex justify-between items-center flex-shrink-0">
        <h2 className="text-sm font-semibold">Knowledge Graph</h2>
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1 h-7 text-xs px-2"
            onClick={() => setShowShareModal(true)}
            disabled={!currentConversation}
            aria-label="Share conversation"
          >
            <Share className="h-3 w-3" />
            Share
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1 h-7 text-xs px-2"
            aria-label="Export conversation"
          >
            <Download className="h-3 w-3" />
            Export
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-1">
        <div className="text-center max-w-[120px]">
          <div className="bg-muted rounded-full p-1 inline-block mb-1">
            <div className="grid grid-cols-3 gap-0.5 w-8 h-8">
              {[...Array(9)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-primary rounded-sm"
                  style={{ opacity: 0.2 + (i * 0.1) }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
          <h3 className="text-xs font-semibold mb-0.5 break-words">Visual Knowledge Map</h3>
          <p className="text-muted-foreground text-xs break-words">
            Relationships between concepts will appear here as you explore topics in your conversation.
          </p>
        </div>
      </div>
      
      {currentConversation && (
        <ShareConversation 
          open={showShareModal} 
          onOpenChange={setShowShareModal} 
          conversationId={currentConversation.id}
        />
      )}
    </div>
  );
}