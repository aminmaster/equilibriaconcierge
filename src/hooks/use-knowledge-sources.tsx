import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KnowledgeSource, Document } from "@/types/knowledge";
import {
  File,
  FileImage,
  FileText as FileTextIcon,
  FileCode,
  FileAudio,
  FileVideo,
  Database
} from "lucide-react";

const SUPPORTED_FILE_TYPES = [
  'text/plain',
  'text/html',
  'text/csv',
  'application/json',
  'application/xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

export const useKnowledgeSources = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

  // Realtime subscription for progress updates
  useEffect(() => {
    const channel = supabase.channel('knowledge_ingestion');
    
    const progressListener = (payload: any) => {
      console.log('Received progress update:', payload);
      
      setSources(prevSources => 
        prevSources.map(source => {
          if (source.id === payload.sourceId) {
            return {
              ...source,
              status: payload.status,
              metadata: {
                ...source.metadata,
                progress: payload.progress
              }
            };
          }
          return source;
        })
      );
      
      // Show toast for significant updates
      if (payload.progress === 100 && payload.status === 'completed') {
        toast({
          title: "Ingestion Complete",
          description: payload.message,
        });
      } else if (payload.status === 'failed') {
        toast({
          title: "Ingestion Failed",
          description: payload.message,
          variant: "destructive",
        });
      }
    };
    
    channel
      .on('broadcast', { event: 'progress_update' }, progressListener)
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        setRealtimeChannel(channel);
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Load knowledge sources and documents
  const loadKnowledgeData = useCallback(async () => {
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
  }, [toast]);

  // Ingest knowledge from file or URL
  const ingestKnowledge = useCallback(async (file: File | null, url: string) => {
    if (!file && !url) {
      throw new Error("Please provide either a file or URL to ingest.");
    }
    
    // Validate file if provided
    if (file) {
      if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
        throw new Error("Unsupported file type. Please upload a supported file type (PDF, DOC, DOCX, TXT, etc.).");
      }
      
      if (file.size > 100 * 1024 * 1024) {
        throw new Error("File too large. Please upload a file smaller than 100MB.");
      }
    }
    
    try {
      // Create knowledge source record
      const sourceData = {
        name: file ? file.name : url,
        type: file ? 'file' : 'url',
        url: url || null
      };
      
      const { data, error } = await supabase
        .from('knowledge_sources')
        .insert([sourceData])
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      } else if (data) {
        // Add to the list immediately
        setSources(prev => [data, ...prev]);
        
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
        
        // Refresh data after ingestion starts
        loadKnowledgeData();
        
        return data;
      }
    } catch (error: any) {
      console.error("Ingestion error:", error);
      throw error;
    }
  }, [loadKnowledgeData]);

  // Delete a single source
  const deleteSource = useCallback(async (id: string) => {
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
        setSources(prev => prev.filter(source => source.id !== id));
        setDocuments(prev => prev.filter(doc => doc.source_id !== id));
        
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
      throw error;
    }
  }, [toast]);

  // Delete all sources
  const deleteAllSources = useCallback(async () => {
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
      throw error;
    }
  }, [toast]);

  // Get document count for a source
  const getDocumentCount = useCallback((sourceId: string) => {
    return documents.filter(doc => doc.source_id === sourceId).length;
  }, [documents]);

  // View documents for a source
  const viewDocuments = useCallback((sourceId: string, sourceName: string) => {
    // This would typically open a modal or navigate; here we just log for now
    console.log("Viewing documents for source:", sourceId, sourceName);
  }, []);

  // Get file icon based on filename - returns JSX.Element
  const getFileIcon = useCallback((fileName: string): JSX.Element => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'pdf':
        return <FileTextIcon className="h-5 w-5 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return <FileImage className="h-5 w-5 text-blue-500" />;
      case 'doc':
      case 'docx':
        return <FileTextIcon className="h-5 w-5 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileTextIcon className="h-5 w-5 text-green-600" />;
      case 'ppt':
      case 'pptx':
        return <FileTextIcon className="h-5 w-5 text-orange-500" />;
      case 'txt':
        return <FileTextIcon className="h-5 w-5 text-gray-500" />;
      case 'html':
      case 'htm':
        return <FileCode className="h-5 w-5 text-orange-600" />;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <FileAudio className="h-5 w-5 text-purple-500" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <FileVideo className="h-5 w-5 text-red-600" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  }, []);

  // Load data on hook mount
  useEffect(() => {
    loadKnowledgeData();
  }, []);

  return {
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
  };
};