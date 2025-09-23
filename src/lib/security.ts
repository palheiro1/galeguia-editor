// Security utilities and validation
import DOMPurify from 'isomorphic-dompurify';

/**
 * Input validation utilities
 */
export class InputValidator {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly PASSWORD_MIN_LENGTH = 8;
  private static readonly MAX_TEXT_LENGTH = 10000;
  
  static validateEmail(email: string): { isValid: boolean; message?: string } {
    if (!email.trim()) {
      return { isValid: false, message: 'Email é obrigatório' };
    }
    
    if (!this.EMAIL_REGEX.test(email)) {
      return { isValid: false, message: 'Email inválido' };
    }
    
    if (email.length > 254) {
      return { isValid: false, message: 'Email muito longo' };
    }
    
    return { isValid: true };
  }
  
  static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (!password) {
      return { isValid: false, message: 'Password é obrigatória' };
    }
    
    if (password.length < this.PASSWORD_MIN_LENGTH) {
      return { isValid: false, message: `Password deve ter pelo menos ${this.PASSWORD_MIN_LENGTH} caracteres` };
    }
    
    if (password.length > 128) {
      return { isValid: false, message: 'Password muito longa' };
    }
    
    // Check for common weak patterns
    const weakPatterns = [
      /^123+/,
      /^abc+/i,
      /^password/i,
      /^qwerty/i,
    ];
    
    if (weakPatterns.some(pattern => pattern.test(password))) {
      return { isValid: false, message: 'Password muito fraca' };
    }
    
    return { isValid: true };
  }
  
  static validateTextInput(
    text: string,
    options: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      allowHTML?: boolean;
    } = {}
  ): { isValid: boolean; message?: string } {
    const {
      required = false,
      minLength = 0,
      maxLength = this.MAX_TEXT_LENGTH,
      allowHTML = false,
    } = options;
    
    if (required && !text.trim()) {
      return { isValid: false, message: 'Campo obrigatório' };
    }
    
    if (text.length < minLength) {
      return { isValid: false, message: `Mínimo ${minLength} caracteres` };
    }
    
    if (text.length > maxLength) {
      return { isValid: false, message: `Máximo ${maxLength} caracteres` };
    }
    
    // Check for potential XSS attempts
    if (!allowHTML && this.containsHTMLTags(text)) {
      return { isValid: false, message: 'HTML não permitido' };
    }
    
    // Check for SQL injection patterns
    if (this.containsSQLInjectionPatterns(text)) {
      return { isValid: false, message: 'Conteúdo suspeito detectado' };
    }
    
    return { isValid: true };
  }
  
  private static containsHTMLTags(text: string): boolean {
    const htmlTagRegex = /<[^>]*>/;
    return htmlTagRegex.test(text);
  }
  
  private static containsSQLInjectionPatterns(text: string): boolean {
    const sqlPatterns = [
      /(\b(select|insert|update|delete|drop|union|exec|execute)\b)/i,
      /(\b(or|and)\s+\d+\s*=\s*\d+)/i,
      /(--|#|\/\*)/,
      /(\bscript\b)/i,
    ];
    
    return sqlPatterns.some(pattern => pattern.test(text));
  }
}

/**
 * Content sanitization utilities
 */
export class ContentSanitizer {
  static sanitizeHTML(html: string): string {
    if (typeof window === 'undefined') {
      // Server-side sanitization (for SSR)
      return this.basicSanitize(html);
    }
    
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
      ALLOWED_ATTR: [],
    });
  }
  
  static sanitizeText(text: string): string {
    return text
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }
  
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }
  
  private static basicSanitize(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');
  }
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private static attempts = new Map<string, { count: number; resetTime: number }>();
  
  static checkRateLimit(
    key: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000 // 15 minutes
  ): { allowed: boolean; remainingAttempts: number; resetTime: number } {
    const now = Date.now();
    const attempt = this.attempts.get(key);
    
    if (!attempt || now > attempt.resetTime) {
      // First attempt or window expired
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remainingAttempts: maxAttempts - 1, resetTime: now + windowMs };
    }
    
    if (attempt.count >= maxAttempts) {
      // Rate limit exceeded
      return { allowed: false, remainingAttempts: 0, resetTime: attempt.resetTime };
    }
    
    // Increment attempt count
    attempt.count++;
    this.attempts.set(key, attempt);
    
    return {
      allowed: true,
      remainingAttempts: maxAttempts - attempt.count,
      resetTime: attempt.resetTime,
    };
  }
  
  static resetRateLimit(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Secure storage utilities
 */
export class SecureStorage {
  
  static async storeSecurely(key: string, value: string): Promise<void> {
    try {
      // In a real implementation, use proper encryption
      const encrypted = btoa(value); // Basic encoding for demo
      localStorage.setItem(`secure_${key}`, encrypted);
    } catch (error) {
      console.error('Error storing secure data:', error);
      throw new Error('Failed to store secure data');
    }
  }
  
  static async retrieveSecurely(key: string): Promise<string | null> {
    try {
      const encrypted = localStorage.getItem(`secure_${key}`);
      if (!encrypted) return null;
      
      // In a real implementation, use proper decryption
      return atob(encrypted); // Basic decoding for demo
    } catch (error) {
      console.error('Error retrieving secure data:', error);
      return null;
    }
  }
  
  static async removeSecurely(key: string): Promise<void> {
    localStorage.removeItem(`secure_${key}`);
  }
}

/**
 * Security headers and CSP utilities
 */
export class SecurityHeaders {
  static getCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' https://unpkg.com", // Allow Expo scripts
      "style-src 'self' 'unsafe-inline'", // Allow inline styles
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "media-src 'self' https:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');
  }
  
  static getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': this.getCSPHeader(),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
  }
}

/**
 * Security audit logging
 */
export class SecurityLogger {
  static logSecurityEvent(event: {
    type: 'auth_attempt' | 'validation_failure' | 'rate_limit' | 'suspicious_activity';
    userId?: string;
    details: Record<string, any>;
    severity: 'low' | 'medium' | 'high';
  }): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      ...event,
    };
    
    console.warn('Security Event:', logEntry);
    
    // In production, send to monitoring service
    // await sendToMonitoringService(logEntry);
  }
}