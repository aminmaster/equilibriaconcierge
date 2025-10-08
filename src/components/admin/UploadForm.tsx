"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadFormProps {
  onIngest: (file: File | null, url: string) => Promise<void>;
  onLoadData: () => void;
}

export function UploadForm({ onIngest, onLoadData }: UploadFormProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (!SUPPORTED_FILE_TYPES.includes(selectedFile.type)) {
        toast({
          title: "Unsupported file type",
          description: "Please upload a supported file type (PDF, DOC, DOCX, TXT, etc.).",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (100MB limit)
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 100MB.",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
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
      await onIngest(file, url);
      // Reset form after successful ingestion
      setFile(null);
      setUrl("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Refresh data after ingestion
      onLoadData();
    } catch (error: any) {
      // Error handled in parent
      console.error("Ingestion error:", error);
    }
  };

  return (
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
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={SUPPORTED_FILE_TYPES.join(',')}
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
            <p className="text-xs text-muted-foreground mt-2">
              Supported formats: PDF, DOC, DOCX, TXT, HTML, CSV, JSON, XML
            </p>
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
            disabled={!file && !url}
          >
            <Upload className="h-4 w-4 mr-2" />
            Ingest Knowledge
          </Button>
        </div>
      </div>
    </div>
  );
}