"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Copy, 
  Share2, 
  Download,
  Link as LinkIcon,
  FileText,
  FileJson
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConversations } from "@/hooks/use-conversations";

interface ShareConversationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export function ShareConversation({ open, onOpenChange, conversationId }: ShareConversationProps) {
  const { toast } = useToast();
  const { exportConversation } = useConversations();
  const [copied, setCopied] = useState(false);
  
  // In a real implementation, this would be a proper shareable URL
  const shareUrl = `${window.location.origin}/share/${conversationId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "The conversation link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy the link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportConversationToFile = async (format: "markdown" | "json") => {
    try {
      const content = await exportConversation(conversationId, format);
      const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation.${format === "json" ? "json" : "md"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export completed",
        description: `Your conversation has been exported as ${format.toUpperCase()}.`,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Failed to export the conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>
            Share this conversation with others or export it in different formats.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="share-url">Share Link</Label>
            <div className="flex gap-2">
              <Input
                id="share-url"
                value={shareUrl}
                readOnly
                className="flex-1"
                aria-label="Conversation share URL"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                aria-label={copied ? "Link copied" : "Copy link to clipboard"}
              >
                {copied ? (
                  <Copy className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="pt-4">
            <Label>Export Options</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => exportConversationToFile("markdown")}
                aria-label="Export as Markdown"
              >
                <FileText className="h-4 w-4" />
                Markdown
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => exportConversationToFile("json")}
                aria-label="Export as JSON"
              >
                <FileJson className="h-4 w-4" />
                JSON
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} aria-label="Close dialog">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}