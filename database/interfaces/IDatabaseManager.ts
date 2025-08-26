/**
 * IDatabaseManager Interface
 * Core database functionality interface following Interface Segregation Principle
 */

export interface IDatabaseManager {
  /**
   * Initialize the database connection
   * @throws DatabaseError if connection fails
   */
  initialize(): Promise<void>;
  
  /**
   * Execute a SQL query with parameters
   * @param query SQL query string
   * @param params Query parameters
   * @returns Query result
   * @throws DatabaseError if query execution fails
   */
  execute<T>(query: string, params?: any[]): Promise<T>;
  
  /**
   * Execute multiple SQL queries in a single transaction
   * @param queries Array of SQL queries and their parameters
   * @returns Array of query results
   * @throws DatabaseError if transaction fails
   */
  transaction<T>(queries: { query: string; params?: any[] }[]): Promise<T[]>;
  
  /**
   * Close the database connection
   */
  close(): Promise<void>;
}
