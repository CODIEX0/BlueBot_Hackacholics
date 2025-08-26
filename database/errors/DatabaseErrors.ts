/**
 * DatabaseError Class
 * Base class for database-related errors
 */
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * ConnectionError Class
 * Error thrown when database connection fails
 */
export class ConnectionError extends DatabaseError {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

/**
 * QueryError Class
 * Error thrown when a database query fails
 */
export class QueryError extends DatabaseError {
  constructor(message: string, public query?: string, public params?: any[]) {
    super(message);
    this.name = 'QueryError';
  }
}

/**
 * TransactionError Class
 * Error thrown when a database transaction fails
 */
export class TransactionError extends DatabaseError {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionError';
  }
}

/**
 * MigrationError Class
 * Error thrown when a database migration fails
 */
export class MigrationError extends DatabaseError {
  constructor(message: string, public version?: number) {
    super(message);
    this.name = 'MigrationError';
  }
}
