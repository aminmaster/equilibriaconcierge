// Encryption utilities for sensitive data

// Simple encryption/decryption functions (in production, use a proper encryption library)
export const encryptApiKey = (apiKey: string, secretKey: string): string => {
  try {
    // In a real implementation, you would use a proper encryption algorithm
    // For demonstration purposes, we'll use a simple XOR cipher
    // Note: This is NOT secure for production use!
    
    let encrypted = '';
    for (let i = 0; i < apiKey.length; i++) {
      const charCode = apiKey.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    // Base64 encode the result
    return btoa(encrypted);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt API key');
  }
};

export const decryptApiKey = (encryptedKey: string, secretKey: string): string => {
  try {
    // Decode from base64
    const decoded = atob(encryptedKey);
    
    // Decrypt using XOR
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt API key');
  }
};

// Generate a random encryption key
export const generateEncryptionKey = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Secure hash function for API key verification (without revealing the key)
export const hashApiKey = async (apiKey: string): Promise<string> => {
  // In a real implementation, use a proper cryptographic hash function
  // For now, we'll use a simple approach for demonstration
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  
  // Simple hash function (NOT cryptographically secure)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data[i]) | 0;
  }
  
  return hash.toString(36);
};

// Verify an API key against its hash
export const verifyApiKey = async (apiKey: string, hashedKey: string): Promise<boolean> => {
  const hash = await hashApiKey(apiKey);
  return hash === hashedKey;
};

// Mask an API key for display (show only first and last few characters)
export const maskApiKey = (apiKey: string): string => {
  if (apiKey.length <= 8) return '••••••••';
  return `${apiKey.substring(0, 4)}••••${apiKey.substring(apiKey.length - 4)}`;
};

// Validate API key format
export const isValidApiKeyFormat = (apiKey: string): boolean => {
  // Basic validation - check if it looks like a typical API key
  // Most API keys are 20+ characters long and contain alphanumeric characters and special chars
  return typeof apiKey === 'string' && 
         apiKey.length >= 20 && 
         apiKey.length <= 200 &&
         /[a-zA-Z0-9]/.test(apiKey);
};