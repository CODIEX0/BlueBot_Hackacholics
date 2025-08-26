import { ILogger } from '../interfaces/ILogger';

/**
 * LogLevel Enum
 * Defines the severity levels for logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * ConsoleLogger Class
 * Simple logger implementation that outputs to console
 */
export class ConsoleLogger implements ILogger {
  private readonly logLevel: LogLevel;
  private readonly timestampEnabled: boolean;
  private readonly context: string;

  constructor(options: {
    logLevel?: LogLevel;
    timestampEnabled?: boolean;
    context?: string;
  } = {}) {
    this.logLevel = options.logLevel || LogLevel.INFO;
    this.timestampEnabled = options.timestampEnabled !== false;
    this.context = options.context || 'App';
  }

  /**
   * Check if the given log level is enabled
   * @param level Log level to check
   * @returns Whether the level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const levels = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Format a log message with timestamp and context
   * @param message Message to format
   * @returns Formatted message
   */
  private formatMessage(message: string): string {
    const timestamp = this.timestampEnabled
      ? `[${new Date().toISOString()}] `
      : '';
      
    return `${timestamp}[${this.context}] ${message}`;
  }

  /**
   * Log a debug message to the console
   * @param message Log message
   * @param context Optional context object
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.isLevelEnabled(LogLevel.DEBUG)) {
      console.debug(
        this.formatMessage(message),
        context ? context : ''
      );
    }
  }

  /**
   * Log an info message to the console
   * @param message Log message
   * @param context Optional context object
   */
  info(message: string, context?: Record<string, any>): void {
    if (this.isLevelEnabled(LogLevel.INFO)) {
      console.info(
        this.formatMessage(message),
        context ? context : ''
      );
    }
  }

  /**
   * Log a warning message to the console
   * @param message Log message
   * @param context Optional context object
   */
  warn(message: string, context?: Record<string, any>): void {
    if (this.isLevelEnabled(LogLevel.WARN)) {
      console.warn(
        this.formatMessage(message),
        context ? context : ''
      );
    }
  }

  /**
   * Log an error message to the console
   * @param message Log message
   * @param error Error object
   * @param context Optional context object
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (this.isLevelEnabled(LogLevel.ERROR)) {
      console.error(
        this.formatMessage(message),
        error ? error : '',
        context ? context : ''
      );
    }
  }
}
