import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ConciergeInterface } from "@/components/concierge-interface";
import { ConversationLog } from "@/components/conversation-log";
import { ConversationCanvas } from "@/components/conversation-canvas";
import { useAuth } from "@/hooks/use-auth.tsx"; // Updated import
import { useAnonymousSession } from "@/hooks/use-anonymous-session";

export default function Concierge() {
  const location = useLocation();
  const { user } = useAuth();
  const { sessionId, isAnonymous } = useAnonymousSession();
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [defaultLayout, setDefaultLayout] = useState<number[]>([70, 30]);

  // Parse URL parameters to set initial input mode
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    if (mode === "voice") {
      setInputMode("voice");
    } else {
      setInputMode("text");
    }
  }, [location.search]);

  // Log session information
  useEffect(() => {
    console.log("User session:", { 
      userId: user?.id, 
      sessionId, 
      isAnonymous 
    });
  }, [user, sessionId, isAnonymous]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden pb-20"> {/* Added padding to prevent overlap */}
        <PanelGroup direction="horizontal">
          <Panel 
            defaultSize={defaultLayout[0]} 
            minSize={20}
            className="relative"
          >
            <ConversationLog />
          </Panel>
          
          <PanelResizeHandle className="w-2 bg-border/30 hover:bg-border transition-colors" />
          
          <Panel 
            defaultSize={defaultLayout[1]} 
            minSize={20}
            className="relative"
          >
            <ConversationCanvas />
          </Panel>
        </PanelGroup>
      </div>
      
      <div className="pb-2"> {/* Reduced padding since input bar is now lower */}
        <ConciergeInterface 
          inputMode={inputMode}
          setInputMode={setInputMode}
        />
      </div>
    </div>
  );
}