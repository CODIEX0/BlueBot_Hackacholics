/**
 * ILogger Interface
 * Logger interface for application-wide logging
 */
export interface ILogger {
  /**
   * Log a debug message
   * @param message Log message
   * @param context Optional context object
   */
  debug(message: string, context?: Record<string, any>): void;
  
  /**
   * Log an info message
   * @param message Log message
   * @param context Optional context object
   */
  info(message: string, context?: Record<string, any>): void;
  
  /**
   * Log a warning message
   * @param message Log message
   * @param context Optional context object
   */
  warn(message: string, context?: Record<string, any>): void;
  
  /**
   * Log an error message
   * @param message Log message
   * @param error Error object
   * @param context Optional context object
   */
  error(message: string, error?: Error, context?: Record<string, any>): void;
}
