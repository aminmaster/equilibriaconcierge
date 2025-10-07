import { useToast } from "@/hooks/use-toast";

interface ErrorHandlerOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning";
}

export class ErrorHandler {
  static handle = (error: any, options: ErrorHandlerOptions = {}) => {
    const { toast } = useToast();
    
    const defaultTitle = "An error occurred";
    const defaultMessage = error.message || "Something went wrong. Please try again.";
    
    toast({
      title: options.title || defaultTitle,
      description: options.description || defaultMessage,
      variant: options.variant || "destructive"
    });
    
    // Log to console for debugging
    console.error("Handled error:", error);
  };

  static handleApiError = (error: any, operation: string) => {
    const { toast } = useToast();
    
    toast({
      title: `${operation} Failed`,
      description: error.message || `Failed to ${operation.toLowerCase()}. Please try again.`,
      variant: "destructive"
    });
    
    console.error(`${operation} error:`, error);
  };

  static handleNetworkError = (error: any) => {
    const { toast } = useToast();
    
    toast({
      title: "Network Error",
      description: "Unable to connect to the server. Please check your connection and try again.",
      variant: "destructive"
    });
    
    console.error("Network error:", error);
  };
}