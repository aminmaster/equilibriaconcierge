import { useState, useEffect } from "react";

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
    
    // Create new anonymous session
    const newSessionId = 'anon_' + Math.random().toString(36).substr(2, 9);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 2); // 48-hour expiry
    
    localStorage.setItem('anonymousSessionId', newSessionId);
    localStorage.setItem('anonymousSessionExpiry', expiryDate.toISOString());
    
    setSessionId(newSessionId);
    setIsAnonymous(true);
  }, []);

  return {
    sessionId,
    isAnonymous
  };
};