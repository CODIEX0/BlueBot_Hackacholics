import { ILogger } from '../interfaces/ILogger';
import { IDatabaseManager } from '../interfaces/IDatabaseManager';
import { MigrationError } from '../errors/DatabaseErrors';

/**
 * Migration Interface
 * Defines a single database migration
 */
interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

/**
 * DatabaseMigrator Class
 * Handles database schema migrations
 */
export class DatabaseMigrator {
  private readonly logger: ILogger;
  private readonly dbManager: IDatabaseManager;
  private readonly migrations: Migration[];
  
  /**
   * DatabaseMigrator constructor
   * @param dbManager Database manager instance
   * @param logger Logger instance
   * @param migrations Array of migrations
   */
  constructor(dbManager: IDatabaseManager, logger: ILogger, migrations: Migration[]) {
    this.dbManager = dbManager;
    this.logger = logger;
    this.migrations = [...migrations].sort((a, b) => a.version - b.version);
  }
  
  /**
   * Initialize the migrations table
   */
  private async initMigrationsTable(): Promise<void> {
    this.logger.info('Initializing migrations table');
    
    await this.dbManager.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);
  }
  
  /**
   * Get the current database version
   * @returns Current version number
   */
  private async getCurrentVersion(): Promise<number> {
    const result = await this.dbManager.execute<{ version: number }[]>(
      'SELECT COALESCE(MAX(version), 0) as version FROM migrations;'
    );
    return result[0]?.version || 0;
  }
  
  /**
   * Apply all pending migrations
   * @returns Number of migrations applied
   */
  async migrateUp(): Promise<number> {
    await this.initMigrationsTable();
    
    const currentVersion = await this.getCurrentVersion();
    this.logger.info(`Current database version: ${currentVersion}`);
    
    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);
    
    if (pendingMigrations.length === 0) {
      this.logger.info('Database is already at the latest version');
      return 0;
    }
    
    this.logger.info(`Applying ${pendingMigrations.length} pending migrations`);
    
    let appliedCount = 0;
    
    for (const migration of pendingMigrations) {
      try {
        this.logger.info(`Applying migration ${migration.version}: ${migration.name}`);
        
        await this.dbManager.transaction([
          { 
            query: migration.up 
          },
          { 
            query: `
              INSERT INTO migrations (version, name, applied_at)
              VALUES (?, ?, ?);
            `,
            params: [migration.version, migration.name, new Date().toISOString()]
          }
        ]);
        
        appliedCount++;
        this.logger.info(`Successfully applied migration ${migration.version}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to apply migration ${migration.version}: ${errorMessage}`, 
          error instanceof Error ? error : undefined);
        throw new MigrationError(`Failed to apply migration ${migration.version}: ${errorMessage}`, migration.version);
      }
    }
    
    this.logger.info(`Database successfully migrated to version ${pendingMigrations[pendingMigrations.length - 1].version}`);
    return appliedCount;
  }
  
  /**
   * Rollback the last applied migration
   * @param steps Number of migrations to rollback (default: 1)
   * @returns Number of migrations rolled back
   */
  async migrateDown(steps: number = 1): Promise<number> {
    await this.initMigrationsTable();
    
    const appliedMigrations = await this.dbManager.execute<{ version: number, name: string }[]>(
      'SELECT version, name FROM migrations ORDER BY version DESC LIMIT ?;',
      [steps]
    );
    
    if (appliedMigrations.length === 0) {
      this.logger.info('No migrations to rollback');
      return 0;
    }
    
    this.logger.info(`Rolling back ${appliedMigrations.length} migrations`);
    
    let rolledBackCount = 0;
    
    for (const applied of appliedMigrations) {
      const migration = this.migrations.find(m => m.version === applied.version);
      
      if (!migration) {
        this.logger.warn(`Migration ${applied.version} not found in migration scripts, skipping rollback`);
        continue;
      }
      
      try {
        this.logger.info(`Rolling back migration ${migration.version}: ${migration.name}`);
        
        await this.dbManager.transaction([
          { 
            query: migration.down 
          },
          { 
            query: 'DELETE FROM migrations WHERE version = ?;',
            params: [migration.version]
          }
        ]);
        
        rolledBackCount++;
        this.logger.info(`Successfully rolled back migration ${migration.version}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to roll back migration ${migration.version}: ${errorMessage}`, 
          error instanceof Error ? error : undefined);
        throw new MigrationError(`Failed to roll back migration ${migration.version}: ${errorMessage}`, migration.version);
      }
    }
    
    const newVersion = await this.getCurrentVersion();
    this.logger.info(`Database successfully rolled back to version ${newVersion}`);
    return rolledBackCount;
  }
}
