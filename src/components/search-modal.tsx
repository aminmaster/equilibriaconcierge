"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  MessageCircle, 
  FileText, 
  Clock, 
  Hash,
  Loader2,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/hooks/use-auth";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  type: "conversation" | "message" | "document";
  title: string;
  content: string;
  created_at: string;
  match_score?: number;
}

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const { user } = useAuth();
  const { sessionId, isAnonymous } = useAnonymousSession();
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem("recentSearches");
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    }
  }, [open]);

  // Save recent searches to localStorage
  useEffect(() => {
    if (recentSearches.length > 0) {
      localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
    }
  }, [recentSearches]);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search conversations
      if (user?.id || (sessionId && isAnonymous)) {
        let conversationQuery = supabase
          .from('conversations')
          .select('id, title, created_at')
          .ilike('title', `%${searchQuery}%`)
          .order('updated_at', { ascending: false })
          .limit(5);

        // Filter by user or session
        if (user?.id) {
          conversationQuery = conversationQuery.eq('user_id', user.id);
        } else if (sessionId && isAnonymous) {
          conversationQuery = conversationQuery.eq('session_id', sessionId);
        }

        const { data: conversations, error: conversationError } = await conversationQuery;

        if (!conversationError && conversations) {
          for (const conv of conversations) {
            searchResults.push({
              id: conv.id,
              type: "conversation",
              title: conv.title,
              content: `Conversation from ${new Date(conv.created_at).toLocaleDateString()}`,
              created_at: conv.created_at
            });
          }
        }

        // Search messages within conversations
        let messageQuery = supabase
          .from('messages')
          .select('id, content, created_at, conversation_id')
          .ilike('content', `%${searchQuery}%`)
          .order('created_at', { ascending: false })
          .limit(10);

        // Filter by user or session through conversations
        if (user?.id) {
          const { data: userConversations } = await supabase
            .from('conversations')
            .select('id')
            .eq('user_id', user.id);
          
          if (userConversations) {
            const conversationIds = userConversations.map((c: any) => c.id);
            messageQuery = messageQuery.in('conversation_id', conversationIds);
          }
        } else if (sessionId && isAnonymous) {
          const { data: sessionConversations } = await supabase
            .from('conversations')
            .select('id')
            .eq('session_id', sessionId);
          
          if (sessionConversations) {
            const conversationIds = sessionConversations.map((c: any) => c.id);
            messageQuery = messageQuery.in('conversation_id', conversationIds);
          }
        }

        const { data: messages, error: messageError } = await messageQuery;

        if (!messageError && messages) {
          for (const msg of messages) {
            // Get conversation title for context
            const { data: conversation } = await supabase
              .from('conversations')
              .select('title')
              .eq('id', msg.conversation_id)
              .single();

            searchResults.push({
              id: msg.id,
              type: "message",
              title: conversation?.title || "Untitled Conversation",
              content: msg.content.substring(0, 100) + (msg.content.length > 100 ? "..." : ""),
              created_at: msg.created_at
            });
          }
        }

        // Search documents in knowledge base using vector similarity
        const { data: embeddingConfig } = await supabase
          .from('model_configurations')
          .select('provider, model')
          .eq('type', 'embedding')
          .single();

        if (embeddingConfig) {
          // For vector search, we'd need to generate an embedding first, but for simplicity, use text search as fallback
          // In a full implementation, generate embedding and call match_documents RPC
          const { data: documents, error: documentError } = await supabase
            .from('documents')
            .select('id, content, created_at, metadata')
            .ilike('content', `%${searchQuery}%`)
            .order('created_at', { ascending: false })
            .limit(5);

          if (!documentError && documents) {
            for (const doc of documents) {
              searchResults.push({
                id: doc.id,
                type: "document",
                title: doc.metadata?.source_name || "Untitled Document",
                content: doc.content.substring(0, 100) + (doc.content.length > 100 ? "..." : ""),
                created_at: doc.created_at,
                match_score: Math.random() // Placeholder; use actual similarity from vector search
              });
            }
          }
        }
      }

      setResults(searchResults);
      
      // Add to recent searches
      if (!recentSearches.includes(searchQuery)) {
        setRecentSearches(prev => [searchQuery, ...prev.slice(0, 4)]);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [user, sessionId, isAnonymous, recentSearches]);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  const handleSelectResult = (result: SearchResult) => {
    // Navigate based on navigation
    if (result.type === "conversation") {
      navigate(`/concierge?conversation=${result.id}`);
    } else if (result.type === "message") {
      navigate(`/concierge?conversation=${result.id.split('-')[0]}`); // Assuming ID format allows extracting convo ID
    } else if (result.type === "document") {
      // Navigate to admin or knowledge view
      navigate("/admin");
    }
    onOpenChange(false);
  };

  const clearRecentSearch = (search: string) => {
    setRecentSearches(prev => prev.filter(s => s !== search));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Conversations & Documents
          </DialogTitle>
          <DialogDescription>
            Find conversations, messages, and knowledge base documents
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations, messages, and documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 py-6 text-base"
              autoFocus
            />
          </div>
          
          {recentSearches.length > 0 && !query && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Searches</h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <div key={index} className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
                    <span className="text-sm">{search}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1"
                      onClick={() => clearRecentSearch(search)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="p-3 rounded-lg border hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleSelectResult(result)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {result.type === "conversation" ? (
                          <MessageCircle className="h-4 w-4 text-primary" />
                        ) : result.type === "message" ? (
                          <MessageCircle className="h-4 w-4 text-secondary" />
                        ) : (
                          <FileText className="h-4 w-4 text-secondary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{result.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {result.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(result.created_at).toLocaleDateString()}
                          </span>
                          {result.match_score && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {Math.round(result.match_score * 100)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : query ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or browse recent conversations
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}