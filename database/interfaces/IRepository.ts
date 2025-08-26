/**
 * IRepository Interface
 * Generic repository interface for database operations
 */

export interface IRepository<T> {
  /**
   * Create a new record
   * @param data Data to create
   * @returns Created record ID
   */
  create(data: Omit<T, 'id'>): Promise<number>;
  
  /**
   * Get record by ID
   * @param id Record ID
   * @returns Record data or null if not found
   */
  getById(id: number): Promise<T | null>;
  
  /**
   * Update an existing record
   * @param id Record ID
   * @param data Data to update
   * @returns true if update successful
   */
  update(id: number, data: Partial<T>): Promise<boolean>;
  
  /**
   * Delete a record
   * @param id Record ID
   * @returns true if deletion successful
   */
  delete(id: number): Promise<boolean>;
  
  /**
   * Get multiple records with optional filtering
   * @param filter Filter criteria
   * @param limit Maximum number of records to return
   * @param offset Number of records to skip
   * @returns Array of records
   */
  getMany(filter?: Partial<T>, limit?: number, offset?: number): Promise<T[]>;
}
