"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { lazy, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { useKnowledgeSources } from "@/hooks/use-knowledge-sources";
import { UploadForm } from "./UploadForm";
import { KnowledgeSourcesList } from "./KnowledgeSourcesList";

const DocumentViewer = lazy(() => import("@/components/admin/DocumentViewer"));

export function KnowledgeBaseTab() {
  const { toast } = useToast();
  const {
    sources,
    documents,
    loading,
    ingestKnowledge,
    deleteSource,
    deleteAllSources,
    loadKnowledgeData,
    getDocumentCount,
    viewDocuments,
    getFileIcon,
  } = useKnowledgeSources();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedSource, setSelectedSource] = useState<{id: string, name: string} | null>(null);

  const handleIngestKnowledge = async (file: File | null, url: string) => {
    try {
      await ingestKnowledge(file, url);
      toast({
        title: "Ingestion started",
        description: "Your knowledge base is being processed. This may take a few minutes.",
      });
    } catch (error: any) {
      toast({
        title: "Ingestion failed",
        description: error.message || "Failed to start knowledge ingestion process.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllSources();
      toast({
        title: "All sources deleted",
        description: "All knowledge sources and documents have been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete all knowledge sources.",
        variant: "destructive",
      });
    }
    setShowDeleteAllDialog(false);
  };

  const handleViewDocuments = (sourceId: string, sourceName: string) => {
    setSelectedSource({ id: sourceId, name: sourceName });
    setShowDocumentViewer(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              Add new documents to the knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 rounded-full border-2 border-current border-t-transparent animate-spin" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Knowledge Sources</CardTitle>
                <CardDescription>
                  Manage existing knowledge sources
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="destructive" size="sm" disabled>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Add new documents to the knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UploadForm 
            onIngest={handleIngestKnowledge}
            onLoadData={loadKnowledgeData}
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Knowledge Sources</CardTitle>
              <CardDescription>
                Manage existing knowledge sources
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadKnowledgeData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowDeleteAllDialog(true)}
                disabled={sources.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <KnowledgeSourcesList
            sources={sources}
            documents={documents}
            onDelete={deleteSource}
            onDeleteAll={handleDeleteAll}
            onViewDocuments={handleViewDocuments}
            getDocumentCount={getDocumentCount}
            getFileIcon={getFileIcon}
          />
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all knowledge sources and their associated documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAll}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Suspense fallback={
        <div className="flex items-center justify-center p-4">
          <div className="h-8 w-8 rounded-full border-2 border-current border-t-transparent animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading document viewer...</span>
        </div>
      }>
        {selectedSource && (
          <DocumentViewer
            open={showDocumentViewer}
            onOpenChange={setShowDocumentViewer}
            sourceId={selectedSource.id}
            sourceName={selectedSource.name}
          />
        )}
      </Suspense>
    </div>
  );
}