import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export const useAnonymousSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  // Session keys
  const SESSION_ID_KEY = 'anonymousSessionId';
  const EXPIRY_KEY = 'anonymousSessionExpiry';

  // Session duration: 48 hours in milliseconds
  const SESSION_DURATION = 48 * 60 * 60 * 1000;

  // Idle timer for periodic extension (30 minutes)
  let idleTimer: NodeJS.Timeout | null = null;

  const extendSession = () => {
    const newExpiry = new Date();
    newExpiry.setTime(newExpiry.getTime() + SESSION_DURATION);
    
    localStorage.setItem(EXPIRY_KEY, newExpiry.toISOString());
    setExpiryDate(newExpiry);
    
    // Reset idle timer
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => {
      // Optional: Check for true inactivity here (e.g., no mouse/keyboard events for X time)
      // For now, just log and continue extending on other interactions
      console.log('Idle timer: Session extended check');
    }, 30 * 60 * 1000); // 30 min idle check
  };

  const cleanupSession = () => {
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    setSessionId(null);
    setExpiryDate(null);
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  useEffect(() => {
    // Check for existing anonymous session
    const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
    const storedExpiry = localStorage.getItem(EXPIRY_KEY);
    
    if (storedSessionId && storedExpiry) {
      const expiry = new Date(storedExpiry);
      const now = new Date();
      
      if (expiry > now) {
        // Valid session found - extend on load (last interaction)
        setSessionId(storedSessionId);
        setExpiryDate(expiry);
        extendSession(); // Extend from now (sliding)
        setIsAnonymous(true);
        return;
      } else {
        // Expired session, clean up
        cleanupSession();
      }
    }
    
    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // User is authenticated
        setSessionId(session.user.id);
        setIsAnonymous(false);
        cleanupSession(); // Clean up anonymous data
      } else {
        // Create new anonymous session
        const newSessionId = 'anon_' + uuidv4();
        extendSession(); // Sets initial expiry and timer
        
        localStorage.setItem(SESSION_ID_KEY, newSessionId);
        localStorage.setItem(EXPIRY_KEY, expiryDate!.toISOString());
        
        setSessionId(newSessionId);
        setIsAnonymous(true);
      }
    });
  }, []);

  // Listen for visibility changes to extend on tab focus (additional activity signal)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && sessionId) {
        extendSession(); // Extend on tab focus (user returning)
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
    };
  }, []);

  return {
    sessionId,
    isAnonymous,
    expiryDate,
    extendSession, // Export for manual calls (e.g., on message send)
    cleanupSession // Export for explicit cleanup if needed
  };
};