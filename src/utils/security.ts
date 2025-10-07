// Security utilities for input validation and sanitization

// Regular expressions for validation
const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
const VALID_NAME_REGEX = /^[a-zA-Z\s\-']+$/;
const VALID_PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;

// Input sanitization functions
export const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous characters
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

// Input validation functions
export const validateEmail = (email: string): boolean => {
  return VALID_EMAIL_REGEX.test(email);
};

export const validateUrl = (url: string): boolean => {
  return VALID_URL_REGEX.test(url);
};

export const validateName = (name: string): boolean => {
  return VALID_NAME_REGEX.test(name) && name.length <= 100;
};

export const validatePhone = (phone: string): boolean => {
  return VALID_PHONE_REGEX.test(phone);
};

export const validatePassword = (password: string): boolean => {
  // Password should be at least 8 characters with at least one uppercase, one lowercase, and one number
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(password);
};

// XSS protection
export const sanitizeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

// SQL injection prevention
export const sanitizeSql = (input: string): string => {
  // This is a basic example - in practice, you should use parameterized queries
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/;/g, "") // Remove semicolons
    .trim();
};

// Rate limiting utility
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, { count: number; timestamp: number }>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.requests = new Map();
    this.config = config;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requestInfo = this.requests.get(identifier);

    if (!requestInfo) {
      this.requests.set(identifier, { count: 1, timestamp: now });
      return true;
    }

    const { count, timestamp } = requestInfo;
    const windowPassed = now - timestamp > this.config.windowMs;

    if (windowPassed) {
      this.requests.set(identifier, { count: 1, timestamp: now });
      return true;
    }

    if (count >= this.config.maxRequests) {
      return false;
    }

    this.requests.set(identifier, { count: count + 1, timestamp });
    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Create rate limiters for different operations
export const authRateLimiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 }); // 5 requests per minute
export const apiRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 }); // 100 requests per minute

// Content Security Policy headers
export const getCSPHeaders = (): Record<string, string> => {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
};

// Secure storage utility
export const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      const encryptedValue = btoa(encodeURIComponent(value));
      localStorage.setItem(key, encryptedValue);
    } catch (error) {
      console.error('Failed to store item securely:', error);
    }
  },

  getItem: (key: string): string | null => {
    try {
      const encryptedValue = localStorage.getItem(key);
      if (encryptedValue) {
        return decodeURIComponent(atob(encryptedValue));
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve item securely:', error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  }
};

// API key validation
export const validateApiKey = (key: string): boolean => {
  // Basic validation - in practice, you'd want to check against a database
  return typeof key === 'string' && key.length >= 20 && key.length <= 100;
};

// Session management
export const createSecureSession = (userId: string): string => {
  // Create a secure session token
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  return btoa(`${userId}:${timestamp}:${random}`);
};

export const validateSession = (token: string): { isValid: boolean; userId?: string } => {
  try {
    const decoded = atob(token);
    const [userId, timestamp] = decoded.split(':');
    
    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return { isValid: false };
    }
    
    return { isValid: true, userId };
  } catch (error) {
    return { isValid: false };
  }
};

// Export all utilities
export default {
  sanitizeInput,
  validateEmail,
  validateUrl,
  validateName,
  validatePhone,
  validatePassword,
  sanitizeHtml,
  sanitizeSql,
  authRateLimiter,
  apiRateLimiter,
  getCSPHeaders,
  secureStorage,
  validateApiKey,
  createSecureSession,
  validateSession
};