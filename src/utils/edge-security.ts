// Security middleware for edge functions

export interface SecurityContext {
  userId?: string;
  isAuthenticated: boolean;
  roles: string[];
  permissions: string[];
}

export class EdgeSecurity {
  static async validateRequest(request: Request): Promise<SecurityContext> {
    const authHeader = request.headers.get('Authorization');
    const context: SecurityContext = {
      isAuthenticated: false,
      roles: [],
      permissions: []
    };

    if (!authHeader) {
      return context;
    }

    try {
      const token = authHeader.replace('Bearer ', '');
      
      // In a real implementation, you would verify the JWT token
      // For now, we'll simulate a basic validation
      if (token.length > 20) {
        context.isAuthenticated = true;
        context.userId = 'user-' + token.substring(0, 8);
        context.roles = ['user'];
        context.permissions = ['read', 'write'];
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }

    return context;
  }

  static checkPermission(context: SecurityContext, requiredPermission: string): boolean {
    if (!context.isAuthenticated) {
      return false;
    }
    
    return context.permissions.includes(requiredPermission);
  }

  static checkRole(context: SecurityContext, requiredRole: string): boolean {
    if (!context.isAuthenticated) {
      return false;
    }
    
    return context.roles.includes(requiredRole);
  }

  static async rateLimitCheck(identifier: string, maxRequests: number, windowMs: number): Promise<boolean> {
    // In a real implementation, you would use Redis or another distributed cache
    // For now, we'll use a simple in-memory approach for demonstration
    const key = `rate-limit:${identifier}`;
    const now = Date.now();
    
    // This is a simplified implementation - in production, use Redis or similar
    const windowStart = now - windowMs;
    
    // Simulate rate limiting logic
    // In reality, you'd store request timestamps and count them
    return true; // Allow request for demo purposes
  }

  static sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      .trim();
  }

  static validateApiKey(apiKey: string): boolean {
    // Basic validation - in practice, check against database
    return typeof apiKey === 'string' && apiKey.length >= 20 && apiKey.length <= 100;
  }

  static getCORSHeaders(): HeadersInit {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Client-Info, APIKey',
      'Access-Control-Max-Age': '86400'
    };
  }
}