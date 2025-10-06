"use client";

import { useState, useEffect } from "react";
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
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface KnowledgeSource {
  id: string;
  name: string;
  type: string;
  url: string;
  status: string;
  created_at: string;
}

export function KnowledgeBaseTab() {
  const { toast } = useToast();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Load knowledge sources
  const loadKnowledgeSources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('knowledge_sources')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSources(data);
      
      // If there are any processing sources, set up auto-refresh
      const processingSources = data.some((source: KnowledgeSource) => 
        source.status === 'processing' || source.status === 'pending'
      );
      
      if (processingSources && !refreshInterval) {
        const interval = setInterval(loadKnowledgeSources, 5000); // Refresh every 5 seconds
        setRefreshInterval(interval);
      } else if (!processingSources && refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
    setLoading(false);
  };

  // Load sources on component mount and clean up interval on unmount
  useEffect(() => {
    loadKnowledgeSources();
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

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
      
      if (error) throw error;
      
      toast({
        title: "Ingestion started",
        description: "Your knowledge base is being processed. This may take a few minutes.",
      });
      
      // Add to the list immediately
      if (data) {
        setSources([data, ...sources]);
      }
      
      // Start auto-refresh if not already started
      if (!refreshInterval) {
        const interval = setInterval(loadKnowledgeSources, 5000);
        setRefreshInterval(interval);
      }
      
      // Call the ingest function
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch('https://jmxemujffofqpqrxajlb.supabase.co/functions/v1/ingest', {
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
        throw new Error(`Ingestion failed: ${response.statusText}`);
      }
      
      // Reset form
      setFile(null);
      setUrl("");
    } catch (error: any) {
      toast({
        title: "Ingestion failed",
        description: error.message || "Failed to start knowledge ingestion process.",
        variant: "destructive",
      });
    }
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
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Ingest Knowledge
                </Button>
              </div>
            </div>
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
            <Button variant="outline" size="sm" onClick={loadKnowledgeSources}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
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
              No knowledge sources found. Upload a document to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">{source.name}</h3>
                      <div className="flex items-center gap-2">
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
                      </div>
                    </div>
                  </div>
                  <Button variant="outline">View</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}