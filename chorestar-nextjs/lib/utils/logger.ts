const isDev = process.env.NODE_ENV === 'development';

/**
 * Client-side safe logger — only outputs in development and checks for window
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
