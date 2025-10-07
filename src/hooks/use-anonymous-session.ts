import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export const useAnonymousSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Session keys
  const SESSION_ID_KEY = 'anonymousSessionId';
  const EXPIRY_KEY = 'anonymousSessionExpiry';

  // Session duration: 48 hours in milliseconds
  const SESSION_DURATION = 48 * 60 * 60 * 1000;

  // Inactivity threshold: 30 minutes of no activity before considering idle
  const INACTIVITY_THRESHOLD = 30 * 60 * 1000;

  const extendSession = () => {
    const newExpiry = new Date();
    newExpiry.setTime(newExpiry.getTime() + SESSION_DURATION);
    
    localStorage.setItem(EXPIRY_KEY, newExpiry.toISOString());
    setExpiryDate(newExpiry);
    
    // Reset activity timer
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
    }
    activityTimerRef.current = setTimeout(() => {
      // Check for true inactivity
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity > INACTIVITY_THRESHOLD) {
        console.log('True inactivity detected: Session not extended');
        // Optionally, prompt user or reduce session expiry here
      } else {
        console.log('Activity detected: Session extended');
        // Extend session only if recent activity
        const extendedExpiry = new Date();
        extendedExpiry.setTime(extendedExpiry.getTime() + SESSION_DURATION);
        localStorage.setItem(EXPIRY_KEY, extendedExpiry.toISOString());
        setExpiryDate(extendedExpiry);
      }
    }, INACTIVITY_THRESHOLD);
  };

  const trackActivity = () => {
    lastActivityRef.current = Date.now();
  };

  const cleanupSession = () => {
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    setSessionId(null);
    setExpiryDate(null);
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
      activityTimerRef.current = null;
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
        trackActivity(); // Update last activity
        extendSession(); // Extend on tab focus (user returning)
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessionId]);

  // Track mouse and keyboard activity for true inactivity detection
  useEffect(() => {
    const handleMouseMove = () => {
      trackActivity();
    };

    const handleKeyDown = () => {
      trackActivity();
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
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