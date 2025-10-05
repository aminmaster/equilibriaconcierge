import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export const useAnonymousSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);

  useEffect(() => {
    // Check for existing anonymous session
    const storedSessionId = localStorage.getItem('anonymousSessionId');
    const sessionExpiry = localStorage.getItem('anonymousSessionExpiry');
    
    if (storedSessionId && sessionExpiry) {
      const expiryDate = new Date(sessionExpiry);
      if (expiryDate > new Date()) {
        // Valid session found
        setSessionId(storedSessionId);
        setIsAnonymous(true);
        return;
      } else {
        // Expired session, clean up
        localStorage.removeItem('anonymousSessionId');
        localStorage.removeItem('anonymousSessionExpiry');
      }
    }
    
    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // User is authenticated
        setSessionId(session.user.id);
        setIsAnonymous(false);
      } else {
        // Create new anonymous session
        const newSessionId = 'anon_' + uuidv4();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 2); // 48-hour expiry
        
        localStorage.setItem('anonymousSessionId', newSessionId);
        localStorage.setItem('anonymousSessionExpiry', expiryDate.toISOString());
        
        setSessionId(newSessionId);
        setIsAnonymous(true);
      }
    });
  }, []);

  return {
    sessionId,
    isAnonymous
  };
};