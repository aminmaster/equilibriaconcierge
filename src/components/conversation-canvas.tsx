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
      <div className="p-3 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Knowledge Graph</h2>
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1 h-8 text-xs"
            onClick={() => setShowShareModal(true)}
            disabled={!currentConversation}
          >
            <Share className="h-3 w-3" />
            Share
          </Button>
          <Button size="sm" variant="outline" className="gap-1 h-8 text-xs">
            <Download className="h-3 w-3" />
            Export
          </Button>
          <Button 
            size="icon" 
            variant="ghost"
            className="h-8 w-8"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-xs">
          <div className="bg-muted rounded-full p-3 inline-block mb-3">
            <div className="grid grid-cols-3 gap-1 w-12 h-12">
              {[...Array(9)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-primary rounded-sm"
                  style={{ opacity: 0.2 + (i * 0.1) }}
                />
              ))}
            </div>
          </div>
          <h3 className="text-base font-semibold mb-1">Visual Knowledge Map</h3>
          <p className="text-muted-foreground text-sm">
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