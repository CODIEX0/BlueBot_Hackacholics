import * as SQLite from 'expo-sqlite';
import { IDatabaseManager } from '../interfaces/IDatabaseManager';
import { ILogger } from '../interfaces/ILogger';
import { ConsoleLogger } from '../logging/ConsoleLogger';
import { ConnectionError, QueryError, TransactionError } from '../errors/DatabaseErrors';

/**
 * SQLiteManager Class
 * Manages SQLite database operations with improved error handling and logging
 */
export class SQLiteManager implements IDatabaseManager {
  private db: SQLite.SQLiteDatabase | null = null;
  private logger: ILogger;
  private databaseName: string;
  private isInitialized: boolean = false;

  /**
   * SQLiteManager constructor
   * @param databaseName Name of the SQLite database
   * @param logger Logger instance (defaults to ConsoleLogger)
   */
  constructor(databaseName: string, logger?: ILogger) {
    this.databaseName = databaseName;
    this.logger = logger || new ConsoleLogger({ context: 'SQLiteManager' });
  }

  /**
   * Initialize the database connection
   * @throws ConnectionError if initialization fails
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info(`Initializing SQLite database: ${this.databaseName}`);
      this.db = await SQLite.openDatabaseAsync(this.databaseName);
      
      // Enable WAL mode for better performance and concurrency
      await this.db.execAsync('PRAGMA journal_mode = WAL;');
      
      // Configure database for better reliability
      await this.db.execAsync('PRAGMA foreign_keys = ON;');
      
      this.logger.info('SQLite database initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to initialize SQLite database: ${errorMessage}`, error instanceof Error ? error : undefined);
      throw new ConnectionError(`Failed to initialize database: ${errorMessage}`);
    }
  }

  /**
   * Ensure database is initialized before operations
   * @throws ConnectionError if database not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.db) {
      throw new ConnectionError('Database not initialized. Call initialize() first.');
    }
  }

  /**
   * Execute a SQL query with parameters
   * @param query SQL query string
   * @param params Query parameters
   * @returns Query result
   * @throws QueryError if query execution fails
   */
  async execute<T>(query: string, params: any[] = []): Promise<T> {
    this.ensureInitialized();
    
    try {
      this.logger.debug(`Executing query: ${query}`, { params });
      
      // Use the appropriate SQLite method based on the query type
      if (query.trim().toLowerCase().startsWith('select')) {
        return await this.db!.getAllAsync(query, params) as unknown as T;
      } else {
        return await this.db!.runAsync(query, params) as unknown as T;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Query execution failed: ${errorMessage}`, error instanceof Error ? error : undefined, { query, params });
      throw new QueryError(`Query execution failed: ${errorMessage}`, query, params);
    }
  }

  /**
   * Execute multiple SQL queries in a single transaction
   * @param queries Array of SQL queries and their parameters
   * @returns Array of query results
   * @throws TransactionError if transaction fails
   */
  async transaction<T>(queries: { query: string; params?: any[] }[]): Promise<T[]> {
    this.ensureInitialized();
    
    try {
      this.logger.debug(`Starting transaction with ${queries.length} queries`);
      
      // Begin transaction
      await this.db!.execAsync('BEGIN TRANSACTION;');
      
      const results: T[] = [];
      
      // Execute each query in the transaction
      for (const { query, params = [] } of queries) {
        const result = await this.execute<T>(query, params);
        results.push(result);
      }
      
      // Commit transaction
      await this.db!.execAsync('COMMIT;');
      
      this.logger.debug(`Transaction completed successfully with ${results.length} results`);
      return results;
    } catch (error) {
      // Roll back transaction on error
      if (this.db) {
        try {
          await this.db.execAsync('ROLLBACK;');
          this.logger.info('Transaction rolled back due to error');
        } catch (rollbackError) {
          this.logger.error('Failed to rollback transaction', 
            rollbackError instanceof Error ? rollbackError : undefined);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Transaction failed: ${errorMessage}`, error instanceof Error ? error : undefined);
      throw new TransactionError(`Transaction failed: ${errorMessage}`);
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      try {
        this.logger.info('Closing database connection');
        this.isInitialized = false;
        this.db = null;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Error closing database: ${errorMessage}`);
      }
    }
  }
  
  /**
   * Get database metrics for monitoring
   * @returns Database metrics
   */
  async getDatabaseMetrics(): Promise<{
    size: number;
    tables: { name: string; rowCount: number }[];
    version: string;
  }> {
    this.ensureInitialized();
    
    // Get database size (in bytes)
    const sizeResult = await this.execute<{ size: number }[]>('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();');
    
    // Get table names
    const tablesResult = await this.execute<{ name: string }[]>("SELECT name FROM sqlite_master WHERE type='table';");
    
    // Get SQLite version
    const versionResult = await this.execute<{ version: string }[]>('SELECT sqlite_version() as version;');
    
    const tables = await Promise.all(
      tablesResult.map(async (table) => {
        const countResult = await this.execute<{ count: number }[]>(`SELECT count(*) as count FROM ${table.name};`);
        return {
          name: table.name,
          rowCount: countResult[0]?.count || 0
        };
      })
    );
    
    return {
      size: sizeResult[0]?.size || 0,
      tables,
      version: versionResult[0]?.version || 'unknown'
    };
  }
}
