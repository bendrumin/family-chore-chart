/**
 * Logger Utility
 * Provides dev-only logging to prevent console spam in production
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Safe logger that only outputs in development mode
 */
export const logger = {
  /**
   * Log informational messages (dev only)
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log warning messages (dev only)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log error messages (always logged, but sanitized in production)
   */
  error: (...args: any[]) => {
    if (isDev) {
      console.error(...args);
    } else {
      // In production, log without sensitive details
      console.error('An error occurred');
    }
  },

  /**
   * Log debug messages (dev only)
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log informational messages (dev only)
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
};

/**
 * Client-side safe logger (checks window)
 */
export const clientLogger = {
  log: (...args: any[]) => {
    if (typeof window !== 'undefined' && isDev) {
      console.log(...args);
    }
  },

  warn: (...args: any[]) => {
    if (typeof window !== 'undefined' && isDev) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    if (typeof window !== 'undefined') {
      if (isDev) {
        console.error(...args);
      } else {
        console.error('An error occurred');
      }
    }
  },
};
