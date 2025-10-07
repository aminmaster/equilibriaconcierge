"use client"; // Ensure client-side for Web Crypto

// Secure encryption utilities using Web Crypto API
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptApiKey(apiKey: string, secretKey: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const key = await deriveKey(secretKey, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(apiKey)
    );
    
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt API key');
  }
}

export async function decryptApiKey(encryptedKey: string, secretKey: string): Promise<string> {
  try {
    const decoder = new TextDecoder();
    const combined = new Uint8Array(atob(encryptedKey).split('').map(c => c.charCodeAt(0)));
    
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    
    const key = await deriveKey(secretKey, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt API key');
  }
}

// Generate a random encryption key (for secretKey param)
export const generateEncryptionKey = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Secure hash function for API key verification (using SHA-256)
export const hashApiKey = async (apiKey: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
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