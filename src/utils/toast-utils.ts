import { toast } from "@/hooks/use-toast";

// Centralized toast utilities
export const showApiError = (error: any, operation: string = "operation") => {
  toast({
    title: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Failed`,
    description: error.message || `Failed to ${operation.toLowerCase()}. Please try again.`,
    variant: "destructive"
  });
};

export const showSuccess = (message: string, description: string = "Action completed successfully.") => {
  toast({
    title: "Success",
    description,
  });
};

export const showValidationError = (field: string, message: string = "Invalid input") => {
  toast({
    title: "Validation Error",
    description: `${field} is invalid: ${message}`,
    variant: "destructive"
  });
};

export const showGenericError = (title: string, description: string) => {
  toast({
    title,
    description,
    variant: "destructive"
  });
};