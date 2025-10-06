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
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle
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

interface ApiKey {
  id: string;
  provider: string;
  created_at: string;
}

interface Model {
  id: string;
  name: string;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("knowledge");
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Knowledge base states
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  
  // API keys states
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiKey, setNewApiKey] = useState({ provider: "", key: "" });
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  
  // Model configuration states
  const [selectedGenerationProvider, setSelectedGenerationProvider] = useState("");
  const [selectedEmbeddingProvider, setSelectedEmbeddingProvider] = useState("");
  const [selectedGenerationModel, setSelectedGenerationModel] = useState("");
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState("");
  const [generationModels, setGenerationModels] = useState<Model[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({});
  
  // Available providers
  const availableProviders = [
    { id: "openrouter", name: "OpenRouter" },
    { id: "openai", name: "OpenAI" },
    { id: "anthropic", name: "Anthropic" },
    { id: "cohere", name: "Cohere" }
  ];

  // Debug: Log user state
  useEffect(() => {
    console.log("Admin page - User state:", user);
    console.log("Admin page - Auth loading:", authLoading);
  }, [user, authLoading]);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        console.log("Checking admin status for user:", user);
        // Check if user has admin role in profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        console.log("Profile data:", profile, "Error:", error);
        
        if (profile?.role === 'admin') {
          console.log("User is admin");
          setIsAdmin(true);
          loadKnowledgeSources();
        } else {
          console.log("User is not admin");
        }
      }
    };
    
    checkAdmin();
  }, [user]);

  // Modified useEffect to include model tab
  useEffect(() => {
    if ((activeTab === "api" || activeTab === "model") && isAdmin) {
      loadApiKeys();
    }
  }, [activeTab, isAdmin]);

  // New useEffect for Generation Models
  useEffect(() => {
    if (selectedGenerationProvider) {
      loadGenerationModels();
    }
  }, [selectedGenerationProvider]);

  // New useEffect for Embedding Models
  useEffect(() => {
    if (selectedEmbeddingProvider) {
      loadEmbeddingModels();
    }
  }, [selectedEmbeddingProvider]);

  const loadApiKeys = async () => {
    setApiKeysLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, provider, created_at')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setApiKeys(data);
        
        // Update provider status
        const status: Record<string, boolean> = {};
        data.forEach((key: ApiKey) => {
          status[key.provider] = true;
        });
        setProviderStatus(status);
        
        // Set default providers if available
        if (!selectedGenerationProvider && status["openrouter"]) {
          setSelectedGenerationProvider("openrouter");
        }
        if (!selectedEmbeddingProvider && status["openai"]) {
          setSelectedEmbeddingProvider("openai");
        }
      }
    } catch (error: any) {
      toast({
        title: "Failed to Load API Keys",
        description: error.message || "Could not fetch API keys.",
        variant: "destructive",
      });
    } finally {
      setApiKeysLoading(false);
    }
  };

  const addApiKey = async () => {
    if (!newApiKey.provider || !newApiKey.key) {
      toast({
        title: "Missing Information",
        description: "Please select a provider and enter an API key.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{
          provider: newApiKey.provider,
          api_key: newApiKey.key
        }])
        .select('id, provider, created_at');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setApiKeys([data[0], ...apiKeys]);
        setNewApiKey({ provider: "", key: "" });
        setProviderStatus({ ...providerStatus, [newApiKey.provider]: true });
        
        toast({
          title: "API Key Added",
          description: `Successfully added API key for ${newApiKey.provider}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Add API Key",
        description: error.message || "Could not add API key.",
        variant: "destructive",
      });
    }
  };

  const deleteApiKey = async (id: string, provider: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setApiKeys(apiKeys.filter(key => key.id !== id));
      setProviderStatus({ ...providerStatus, [provider]: false });
      
      // Reset selections if the deleted key was selected
      if (selectedGenerationProvider === provider) {
        setSelectedGenerationProvider("");
        setGenerationModels([]);
      }
      if (selectedEmbeddingProvider === provider) {
        setSelectedEmbeddingProvider("");
        setEmbeddingModels([]);
      }
      
      toast({
        title: "API Key Deleted",
        description: `Successfully deleted API key for ${provider}.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Delete API Key",
        description: error.message || "Could not delete API key.",
        variant: "destructive",
      });
    }
  };

  // Load generation models based on selected provider
  const loadGenerationModels = async () => {
    if (!selectedGenerationProvider) return;
    
    // Check if we have an API key for this provider
    const hasApiKey = apiKeys.some(key => key.provider === selectedGenerationProvider);
    if (!hasApiKey) {
      toast({
        title: "API Key Required",
        description: `Please add an API key for ${selectedGenerationProvider} first.`,
        variant: "destructive",
      });
      return;
    }
    
    setModelsLoading(true);
    try {
      let modelList: Model[] = [];
      
      if (selectedGenerationProvider === "openrouter") {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (response.ok) {
          const data = await response.json();
          modelList = data.data.map((model: any) => ({
            id: model.id,
            name: model.name
          }));
        }
      } else if (selectedGenerationProvider === "openai") {
        // OpenAI models
        modelList = [
          { id: "gpt-4o", name: "GPT-4o" },
          { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
          { id: "gpt-4", name: "GPT-4" },
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" }
        ];
      } else if (selectedGenerationProvider === "anthropic") {
        // Anthropic models
        modelList = [
          { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet" },
          { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
          { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
          { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" }
        ];
      }
      
      setGenerationModels(modelList);
      
      // Set a default model if none is selected
      if (!selectedGenerationModel && modelList.length > 0) {
        setSelectedGenerationModel(modelList[0].id);
      }
      
      toast({
        title: "Models Loaded",
        description: `Successfully loaded ${modelList.length} models from ${selectedGenerationProvider}.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Load Models",
        description: error.message || `Could not fetch models from ${selectedGenerationProvider}.`,
        variant: "destructive",
      });
    } finally {
      setModelsLoading(false);
    }
  };

  // Load embedding models based on selected provider
  const loadEmbeddingModels = async () => {
    if (!selectedEmbeddingProvider) return;
    
    // Check if we have an API key for this provider
    const hasApiKey = apiKeys.some(key => key.provider === selectedEmbeddingProvider);
    if (!hasApiKey) {
      toast({
        title: "API Key Required",
        description: `Please add an API key for ${selectedEmbeddingProvider} first.`,
        variant: "destructive",
      });
      return;
    }
    
    setModelsLoading(true);
    try {
      let modelList: Model[] = [];
      
      if (selectedEmbeddingProvider === "openai") {
        // OpenAI embedding models
        modelList = [
          { id: "text-embedding-3-large", name: "Text Embedding 3 Large" },
          { id: "text-embedding-3-small", name: "Text Embedding 3 Small" },
          { id: "text-embedding-ada-002", name: "Text Embedding Ada 002" }
        ];
      } else if (selectedEmbeddingProvider === "cohere") {
        // Cohere embedding models
        modelList = [
          { id: "embed-english-v3.0", name: "Embed English v3.0" },
          { id: "embed-multilingual-v3.0", name: "Embed Multilingual v3.0" },
          { id: "embed-english-light-v3.0", name: "Embed English Light v3.0" }
        ];
      }
      
      setEmbeddingModels(modelList);
      
      // Set a default model if none is selected
      if (!selectedEmbeddingModel && modelList.length > 0) {
        setSelectedEmbeddingModel(modelList[0].id);
      }
      
      toast({
        title: "Embedding Models Loaded",
        description: `Successfully loaded ${modelList.length} embedding models from ${selectedEmbeddingProvider}.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Load Embedding Models",
        description: error.message || `Could not fetch embedding models from ${selectedEmbeddingProvider}.`,
        variant: "destructive",
      });
    } finally {
      setModelsLoading(false);
    }
  };

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

  const handleSaveModelConfig = () => {
    if (!selectedGenerationProvider || !selectedGenerationModel) {
      toast({
        title: "Generation Model Required",
        description: "Please select a generation provider and model.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedEmbeddingProvider || !selectedEmbeddingModel) {
      toast({
        title: "Embedding Model Required",
        description: "Please select an embedding provider and model.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Model configuration updated",
      description: `Generation: ${selectedGenerationProvider}/${selectedGenerationModel}, Embedding: ${selectedEmbeddingProvider}/${selectedEmbeddingModel}`,
    });
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            <p className="text-sm text-muted-foreground mt-2">
              User role: {user.role}
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
            {/* Knowledge Base Tab */}
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
            
            {/* API Keys Tab */}
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
                      <Label>Add New API Key</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={newApiKey.provider} 
                          onValueChange={(value) => setNewApiKey({...newApiKey, provider: value})}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProviders.map((provider) => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="password"
                          placeholder="API key"
                          value={newApiKey.key}
                          onChange={(e) => setNewApiKey({...newApiKey, key: e.target.value})}
                          className="flex-1"
                        />
                        <Button onClick={addApiKey}>Add</Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Saved API Keys</Label>
                      {apiKeysLoading ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                          ))}
                        </div>
                      ) : apiKeys.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No API keys saved yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {apiKeys.map((key) => (
                            <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                {providerStatus[key.provider] ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                                <div>
                                  <p className="font-medium">
                                    {availableProviders.find(p => p.id === key.provider)?.name || key.provider}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Added {new Date(key.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => deleteApiKey(key.id, key.provider)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Model Configuration Tab */}
            {activeTab === "model" && (
              <Card>
                <CardHeader>
                  <CardTitle>Model Configuration</CardTitle>
                  <CardDescription>
                    Select the AI models and providers for generating responses and creating embeddings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {/* Generation Model Configuration */}
                    <div className="space-y-4 p-4 border rounded-lg bg-background">
                      <h3 className="font-medium text-lg">Text Generation</h3>
                      
                      <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select 
                          value={selectedGenerationProvider} 
                          onValueChange={(value) => {
                            setSelectedGenerationProvider(value);
                            setSelectedGenerationModel("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProviders
                              .filter(provider => providerStatus[provider.id])
                              .map((provider) => (
                                <SelectItem key={provider.id} value={provider.id}>
                                  {provider.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {selectedGenerationProvider && !providerStatus[selectedGenerationProvider] && (
                          <p className="text-sm text-destructive">
                            Please add an API key for this provider in the API Keys tab.
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Model</Label>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={loadGenerationModels}
                            disabled={modelsLoading || !selectedGenerationProvider || !providerStatus[selectedGenerationProvider]}
                          >
                            {modelsLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              "Refresh Models"
                            )}
                          </Button>
                        </div>
                        <Select 
                          value={selectedGenerationModel} 
                          onValueChange={setSelectedGenerationModel}
                          disabled={!selectedGenerationProvider || !providerStatus[selectedGenerationProvider]}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {generationModels.length > 0 ? (
                              generationModels.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                {selectedGenerationProvider ? "No models loaded - click Refresh Models" : "Select a provider first"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Embedding Model Configuration */}
                    <div className="space-y-4 p-4 border rounded-lg bg-background">
                      <h3 className="font-medium text-lg">Text Embedding</h3>
                      
                      <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select 
                          value={selectedEmbeddingProvider} 
                          onValueChange={(value) => {
                            setSelectedEmbeddingProvider(value);
                            setSelectedEmbeddingModel("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProviders
                              .filter(provider => providerStatus[provider.id])
                              .map((provider) => (
                                <SelectItem key={provider.id} value={provider.id}>
                                  {provider.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {selectedEmbeddingProvider && !providerStatus[selectedEmbeddingProvider] && (
                          <p className="text-sm text-destructive">
                            Please add an API key for this provider in the API Keys tab.
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Model</Label>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={loadEmbeddingModels}
                            disabled={modelsLoading || !selectedEmbeddingProvider || !providerStatus[selectedEmbeddingProvider]}
                          >
                            {modelsLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              "Refresh Models"
                            )}
                          </Button>
                        </div>
                        <Select 
                          value={selectedEmbeddingModel} 
                          onValueChange={setSelectedEmbeddingModel}
                          disabled={!selectedEmbeddingProvider || !providerStatus[selectedEmbeddingProvider]}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select embedding model" />
                          </SelectTrigger>
                          <SelectContent>
                            {embeddingModels.length > 0 ? (
                              embeddingModels.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                {selectedEmbeddingProvider ? "No models loaded - click Refresh Models" : "Select a provider first"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Temperature</Label>
                        <Input 
                          type="range" 
                          min="0" 
                          max="2" 
                          step="0.1" 
                          defaultValue="0.7" 
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