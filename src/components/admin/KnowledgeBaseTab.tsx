"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Upload,
  FileUp,
  Globe,
  RefreshCw,
  Trash2,
  FileSearch,
  Database,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { DocumentViewer } from "@/components/admin/DocumentViewer";

interface KnowledgeSource {
  id: string;
  name: string;
  type: string;
  url: string;
  status: string;
  created_at: string;
}

interface Document {
  id: string;
  source_id: string;
  content: string;
  created_at: string;
  metadata: any;
}

export function KnowledgeBaseTab() {
  const { toast } = useToast();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<number | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedSource, setSelectedSource] = useState<{id: string, name: string} | null>(null);

  // Load knowledge sources and documents
  const loadKnowledgeData = async () => {
    setLoading(true);
    try {
      // Load knowledge sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('knowledge_sources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (sourcesError) {
        console.error("Database error (sources):", sourcesError);
        toast({
          title: "Failed to Load Knowledge Sources",
          description: sourcesError.message || "Could not fetch knowledge sources.",
          variant: "destructive",
        });
      } else if (sourcesData) {
        setSources(sourcesData);
      }

      // Load documents count for each source
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('id, source_id, created_at, metadata')
        .order('created_at', { ascending: false });
      
      if (documentsError) {
        console.error("Database error (documents):", documentsError);
      } else if (documentsData) {
        setDocuments(documentsData);
      }
    } catch (error: any) {
      toast({
        title: "Failed to Load Knowledge Data",
        description: error.message || "Could not fetch knowledge data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useState(() => {
    loadKnowledgeData();
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleIngestKnowledge = async () => {
    if (!file && !url) {
      toast({
        title: "Missing input",
        description: "Please provide either a file or URL to ingest.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setProcessingProgress(0);
      
      // Create knowledge source record
      const { data, error } = await supabase
        .from('knowledge_sources')
        .insert([{
          name: file ? file.name : url,
          type: file ? 'file' : 'url',
          url: url || null
        }])
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      } else if (data) {
        toast({
          title: "Ingestion started",
          description: "Your knowledge base is being processed. This may take a few minutes.",
        });
        
        // Add to the list immediately
        setSources([data, ...sources]);
        
        // Call the ingest function
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        const projectId = "jmxemujffofqpqrxajlb";
        const functionUrl = `https://${projectId}.supabase.co/functions/v1/ingest`;
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({
            sourceId: data.id
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ingestion failed: ${response.statusText} - ${errorText}`);
        }
        
        // Reset form and progress
        setFile(null);
        setUrl("");
        setProcessingProgress(null);
        
        // Refresh data
        loadKnowledgeData();
      }
    } catch (error: any) {
      console.error("Ingestion error:", error);
      setProcessingProgress(null);
      toast({
        title: "Ingestion failed",
        description: error.message || "Failed to start knowledge ingestion process.",
        variant: "destructive",
      });
    }
  };

  const deleteSource = async (id: string) => {
    try {
      // Delete the knowledge source
      const { error } = await supabase
        .from('knowledge_sources')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      } else {
        // Also delete associated documents
        await supabase
          .from('documents')
          .delete()
          .eq('source_id', id);
        
        // Update the UI
        setSources(sources.filter(source => source.id !== id));
        setDocuments(documents.filter(doc => doc.source_id !== id));
        
        toast({
          title: "Source deleted",
          description: "The knowledge source has been removed.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete the knowledge source.",
        variant: "destructive",
      });
    }
  };

  const deleteAllSources = async () => {
    try {
      // Delete all knowledge sources
      const { error: sourcesError } = await supabase
        .from('knowledge_sources')
        .delete();
      
      if (sourcesError) {
        throw new Error(sourcesError.message);
      } else {
        // Delete all documents
        const { error: documentsError } = await supabase
          .from('documents')
          .delete();
        
        if (documentsError) {
          throw new Error(documentsError.message);
        } else {
          // Update the UI
          setSources([]);
          setDocuments([]);
          
          toast({
            title: "All sources deleted",
            description: "All knowledge sources and documents have been removed.",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete all knowledge sources.",
        variant: "destructive",
      });
    }
  };

  const getDocumentCount = (sourceId: string) => {
    return documents.filter(doc => doc.source_id === sourceId).length;
  };

  const viewDocuments = (sourceId: string, sourceName: string) => {
    setSelectedSource({ id: sourceId, name: sourceName });
    setShowDocumentViewer(true);
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Upload File</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {file ? file.name : "Drag and drop or click to upload"}
                  </p>
                  <Input
                    type="file"
                    className="hidden"
                    id="file-upload"
                    onChange={handleFileChange}
                  />
                  <Label htmlFor="file-upload">
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      asChild
                    >
                      <span>Select File</span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Import from URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/document.pdf"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <Button variant="outline">
                    <Globe className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  className="w-full" 
                  onClick={handleIngestKnowledge}
                  disabled={processingProgress !== null}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Ingest Knowledge
                </Button>
              </div>
            </div>
          </div>
          
          {processingProgress !== null && (
            <div className="space-y-2">
              <Label>Processing...</Label>
              <Progress value={processingProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                Your document is being processed and embedded. This may take a few minutes.
              </p>
            </div>
          )}
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
                onClick={() => loadKnowledgeData()}
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
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No knowledge sources found</h3>
              <p className="text-muted-foreground">
                Upload a document to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
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
                          {getDocumentCount(source.id)} chunks
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => viewDocuments(source.id, source.name)}
                      disabled={source.status !== 'completed'}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteSource(source.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              onClick={deleteAllSources}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedSource && (
        <DocumentViewer
          open={showDocumentViewer}
          onOpenChange={setShowDocumentViewer}
          sourceId={selectedSource.id}
          sourceName={selectedSource.name}
        />
      )}
    </div>
  );
}