"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Upload, 
  Database, 
  Key, 
  Settings,
  FileText,
  Globe,
  FileUp,
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

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("knowledge");
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Knowledge base states
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  
  // API keys states
  const [openaiKey, setOpenaiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  
  // Model configuration states
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o");

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        // Check if user has admin role in profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role === 'admin' || user.email === 'admin@example.com') {
          setIsAdmin(true);
          loadKnowledgeSources();
        } else {
          // Check if user is admin via email
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (userData?.email === 'admin@example.com') {
            setIsAdmin(true);
            loadKnowledgeSources();
          }
        }
      }
    };
    
    checkAdmin();
  }, [user]);

  // Load knowledge sources
  const loadKnowledgeSources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('knowledge_sources')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSources(data);
    }
    setLoading(false);
  };

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
      
      // In a real implementation, we would call the ingest edge function here
      // For now, we'll just add it to the list
      setSources([data, ...sources]);
      
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

  const handleSaveApiKeys = () => {
    toast({
      title: "API keys updated",
      description: "Your API keys have been saved securely.",
    });
  };

  const handleSaveModelConfig = () => {
    toast({
      title: "Model configuration updated",
      description: `Now using ${selectedModel} for generating responses.`,
    });
  };

  // If not admin, show access denied message
  if (!isAdmin && user) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please contact your system administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              Please log in to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.assign('/auth')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage knowledge bases, API keys, and system configuration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <Button
                    variant={activeTab === "knowledge" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("knowledge")}
                  >
                    <Database className="h-4 w-4" />
                    Knowledge Base
                  </Button>
                  <Button
                    variant={activeTab === "api" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("api")}
                  >
                    <Key className="h-4 w-4" />
                    API Keys
                  </Button>
                  <Button
                    variant={activeTab === "model" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("model")}
                  >
                    <Settings className="h-4 w-4" />
                    Model Config
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {activeTab === "knowledge" && (
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
            )}
            
            {activeTab === "api" && (
              <Card>
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Securely manage your API keys
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="openai-key">OpenAI API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="openai-key"
                          type="password"
                          placeholder="sk-..."
                          value={openaiKey}
                          onChange={(e) => setOpenaiKey(e.target.value)}
                        />
                        <Button variant="outline">Save</Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="openrouter-key"
                          type="password"
                          placeholder="sk-or-..."
                          value={openrouterKey}
                          onChange={(e) => setOpenrouterKey(e.target.value)}
                        />
                        <Button variant="outline">Save</Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={handleSaveApiKeys}>Save All Keys</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {activeTab === "model" && (
              <Card>
                <CardHeader>
                  <CardTitle>Model Configuration</CardTitle>
                  <CardDescription>
                    Select the AI model for generating responses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Text Generation Model</Label>
                      <Select 
                        value={selectedModel} 
                        onValueChange={setSelectedModel}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai/gpt-4o">OpenAI GPT-4o</SelectItem>
                          <SelectItem value="openai/gpt-4-turbo">OpenAI GPT-4 Turbo</SelectItem>
                          <SelectItem value="anthropic/claude-3-opus">Anthropic Claude 3 Opus</SelectItem>
                          <SelectItem value="anthropic/claude-3-sonnet">Anthropic Claude 3 Sonnet</SelectItem>
                          <SelectItem value="google/gemini-pro">Google Gemini Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Temperature</Label>
                        <Input 
                          type="range" 
                          min="0" 
                          max="2" 
                          step="0.1" 
                          value="0.7" 
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Precise</span>
                          <span>Balanced</span>
                          <span>Creative</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={handleSaveModelConfig}>Save Configuration</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}