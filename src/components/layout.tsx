"use client";

import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { CommandCenter } from "@/components/command-center";
import { SearchModal } from "@/components/search-modal";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient();

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isMounted, setIsMounted] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
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
  const isFullScreenRoute = location.pathname === "/" || location.pathname === "/concierge" || location.pathname === "/fullscreen";
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div 
          className="relative min-h-screen bg-background"
          ref={mainContentRef}
          tabIndex={-1}
        >
          {/* Global Search Button - Fixed top-right, hidden on full-screen routes */}
          {!isFullScreenRoute && (
            <div className="fixed top-4 right-4 z-40">
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-full bg-background/80 backdrop-blur-sm border shadow-md hover:bg-accent transition-colors"
                aria-label="Open global search"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          )}
          
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
        <SearchModal 
          open={showSearch} 
          onOpenChange={setShowSearch} 
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}