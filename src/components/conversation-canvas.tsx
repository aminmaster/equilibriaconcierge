"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Share, 
  Download, 
  Maximize2, 
  Minimize2 
} from "lucide-react";

export function ConversationCanvas() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">Knowledge Graph</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <Share className="h-4 w-4" />
            Share
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="bg-muted rounded-full p-4 inline-block mb-4">
            <div className="grid grid-cols-3 gap-2 w-16 h-16">
              {[...Array(9)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-primary rounded-sm"
                  style={{ opacity: 0.2 + (i * 0.1) }}
                />
              ))}
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Visual Knowledge Map</h3>
          <p className="text-muted-foreground">
            Relationships between concepts will appear here as you explore topics in your conversation.
          </p>
        </div>
      </div>
    </div>
  );
}