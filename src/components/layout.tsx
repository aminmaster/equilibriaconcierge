"use client";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { CommandCenter } from "@/components/command-center";
import { cn } from "@/lib/utils";

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
        <div className="relative min-h-screen bg-background">
          <main className="relative">
            {children}
          </main>
          <CommandCenter />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}