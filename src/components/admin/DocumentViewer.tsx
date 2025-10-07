"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar, 
  Hash,
  Database,
  Copy,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  source_id: string;
  content: string;
  created_at: string;
  metadata: any;
}

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  sourceName: string;
}

export function DocumentViewer({ open, onOpenChange, sourceId, sourceName }: DocumentViewerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open && sourceId) {
      loadDocuments();
    }
  }, [open, sourceId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('source_id', sourceId)
        .order('created_at', { ascending: true });
      
      if (error) {
        throw new Error(error.message);
      } else if (data) {
        setDocuments(data);
      }
    } catch (error: any) {
      toast({
        title: "Failed to Load Documents",
        description: error.message || "Could not fetch documents.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Document content has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents for "{sourceName}"
          </DialogTitle>
          <DialogDescription>
            View and manage individual document chunks
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No documents found</h3>
              <p className="text-muted-foreground">
                This source has not been processed yet or contains no documents.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {documents.map((doc, index) => (
                  <div key={doc.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          Chunk {index + 1}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        {doc.metadata && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {doc.metadata.chunk_index !== undefined ? doc.metadata.chunk_index + 1 : 'N/A'}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(doc.content)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm whitespace-pre-wrap">
                        {doc.content.substring(0, 500)}
                        {doc.content.length > 500 && '...'}
                      </p>
                      {doc.content.length > 500 && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-xs"
                          onClick={() => copyToClipboard(doc.content)}
                        >
                          Copy full content ({doc.content.length} characters)
                        </Button>
                      )}
                    </div>
                    
                    {doc.metadata && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(doc.metadata).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Info className="h-4 w-4" />
            {documents.length} document chunk{documents.length !== 1 ? 's' : ''}
          </div>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}