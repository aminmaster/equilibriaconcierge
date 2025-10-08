"use client";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KnowledgeSourcesListProps {
  sources: any[];
  documents: any[];
  onDelete: (id: string) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onViewDocuments: (sourceId: string, sourceName: string) => void;
  getDocumentCount: (sourceId: string) => number;
  getFileIcon: (fileName: string) => JSX.Element;
}

export function KnowledgeSourcesList({
  sources,
  documents,
  onDelete,
  onDeleteAll,
  onViewDocuments,
  getDocumentCount,
  getFileIcon,
}: KnowledgeSourcesListProps) {
  const { toast } = useToast();

  const handleDeleteSource = async (id: string) => {
    try {
      await onDelete(id);
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete the knowledge source.",
        variant: "destructive",
      });
    }
  };

  const handleViewDocuments = (sourceId: string, sourceName: string) => {
    onViewDocuments(sourceId, sourceName);
  };

  if (sources.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No knowledge sources found</h3>
        <p className="text-muted-foreground">
          Upload a document to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sources.map((source) => {
        const progress = source.metadata?.progress || 0;
        const isProcessing = source.status === 'processing';
        const documentCount = getDocumentCount(source.id);
        
        return (
          <div key={source.id} className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex items-start gap-4">
              {getFileIcon(source.name)}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{source.name}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-muted-foreground">
                    {new Date(source.created_at).toLocaleDateString()}
                  </p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    source.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : source.status === 'processing' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : source.status === 'failed' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                  }`}>
                    {source.status.charAt(0).toUpperCase() + source.status.slice(1)}
                  </span>
                  <span className="inline-flex items-center text-sm text-muted-foreground">
                    <Database className="h-3 w-3 mr-1" />
                    {documentCount} chunks
                  </span>
                </div>
                
                {isProcessing && progress > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}
                
                {source.metadata?.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    Error: {source.metadata.error}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleViewDocuments(source.id, source.name)}
                disabled={source.status !== 'completed'}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleDeleteSource(source.id)}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}