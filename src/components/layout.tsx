"use client";

import { useEffect, useState, useRef } from "react";
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
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Focus management - move focus to main content on route change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.focus();
    }
  }, [location.pathname]);

  // Check if we're on full-screen routes
  const isFullScreenRoute = location.pathname === "/" || location.pathname === "/concierge";
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div 
          className="relative min-h-screen bg-background"
          ref={mainContentRef}
          tabIndex={-1}
        >
          <main 
            className={cn(
              "relative",
              isFullScreenRoute ? "h-screen" : "min-h-screen"
            )}
          >
            {children}
          </main>
          <CommandCenter />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}