"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Share, 
  Download, 
  Maximize2, 
  Minimize2 
} from "lucide-react";
import { ShareConversation } from "@/components/share-conversation";
import { useConversations } from "@/hooks/use-conversations";

export function ConversationCanvas() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { currentConversation } = useConversations();

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b flex justify-between items-center">
        <h2 className="text-base font-semibold">Knowledge Graph</h2>
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1 h-7 text-xs"
            onClick={() => setShowShareModal(true)}
            disabled={!currentConversation}
          >
            <Share className="h-3 w-3" />
            Share
          </Button>
          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
            <Download className="h-3 w-3" />
            Export
          </Button>
          <Button 
            size="icon" 
            variant="ghost"
            className="h-7 w-7"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="text-center max-w-[140px]">
          <div className="bg-muted rounded-full p-2 inline-block mb-2">
            <div className="grid grid-cols-3 gap-0.5 w-10 h-10">
              {[...Array(9)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-primary rounded-sm"
                  style={{ opacity: 0.2 + (i * 0.1) }}
                />
              ))}
            </div>
          </div>
          <h3 className="text-sm font-semibold mb-1">Visual Knowledge Map</h3>
          <p className="text-muted-foreground text-xs">
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