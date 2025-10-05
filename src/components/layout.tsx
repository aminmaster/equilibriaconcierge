"use client";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { CommandCenter } from "@/components/command-center";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth.tsx"; // Updated import

const queryClient = new QueryClient();

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if we're on full-screen routes
  const isFullScreenRoute = location.pathname === "/" || location.pathname === "/concierge";
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className={cn(
          "relative min-h-screen bg-background",
          isFullScreenRoute && isMounted ? "h-screen overflow-hidden" : "h-auto"
        )}>
          <main className={cn(
            "relative",
            isFullScreenRoute ? "h-full" : "pb-20"
          )}>
            {children}
          </main>
          <CommandCenter />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}