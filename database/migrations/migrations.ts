/**
 * Database migrations
 * Defines the versioned schema changes for the database
 */

export const migrations = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      -- Expenses table
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebaseId TEXT UNIQUE,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        merchant TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        receiptUrl TEXT,
        isRecurring INTEGER DEFAULT 0,
        userId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending'
      );
      
      -- Receipts table
      CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebaseId TEXT UNIQUE,
        imageUri TEXT NOT NULL,
        merchantName TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        items TEXT,
        category TEXT NOT NULL,
        processed INTEGER DEFAULT 0,
        ocrConfidence REAL DEFAULT 0,
        userId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending'
      );
      
      -- Financial Goals table
      CREATE TABLE IF NOT EXISTS financial_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebaseId TEXT UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        targetAmount REAL NOT NULL,
        currentAmount REAL DEFAULT 0,
        deadline TEXT NOT NULL,
        category TEXT NOT NULL,
        userId TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending'
      );
      
      -- Transactions table
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebaseId TEXT UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        fromAccount TEXT,
        toAccount TEXT,
        userId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending'
      );
      
      -- Educational Progress table
      CREATE TABLE IF NOT EXISTS educational_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        courseId TEXT NOT NULL,
        lessonId TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        completedAt TEXT,
        createdAt TEXT NOT NULL,
        UNIQUE(userId, courseId, lessonId)
      );
      
      -- User Achievements table
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        achievementId TEXT NOT NULL,
        unlockedAt TEXT NOT NULL,
        UNIQUE(userId, achievementId)
      );
      
      -- Crypto Wallets table (encrypted data)
      CREATE TABLE IF NOT EXISTS crypto_wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL UNIQUE,
        encryptedPrivateKey TEXT NOT NULL,
        publicKey TEXT NOT NULL,
        address TEXT NOT NULL,
        network TEXT NOT NULL DEFAULT 'ethereum',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(userId, date DESC);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
      CREATE INDEX IF NOT EXISTS idx_expenses_sync ON expenses(syncStatus);
      
      CREATE INDEX IF NOT EXISTS idx_receipts_user_date ON receipts(userId, date DESC);
      CREATE INDEX IF NOT EXISTS idx_receipts_sync ON receipts(syncStatus);
      
      CREATE INDEX IF NOT EXISTS idx_goals_user ON financial_goals(userId);
      CREATE INDEX IF NOT EXISTS idx_goals_active ON financial_goals(isActive);
      
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(userId, date DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_sync ON transactions(syncStatus);
      
      CREATE INDEX IF NOT EXISTS idx_educational_progress_user ON educational_progress(userId);
      CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(userId);
      CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user ON crypto_wallets(userId);
    `,
    down: `
      DROP TABLE IF EXISTS expenses;
      DROP TABLE IF EXISTS receipts;
      DROP TABLE IF EXISTS financial_goals;
      DROP TABLE IF EXISTS transactions;
      DROP TABLE IF EXISTS educational_progress;
      DROP TABLE IF EXISTS user_achievements;
      DROP TABLE IF EXISTS crypto_wallets;
    `
  },
  {
    version: 2,
    name: 'add_transaction_timestamps',
    up: `
      -- Add transaction timestamp columns for better tracking
      ALTER TABLE transactions ADD COLUMN processedAt TEXT;
      ALTER TABLE transactions ADD COLUMN confirmedAt TEXT;
      
      -- Add transaction reference column for tracking related transactions
      ALTER TABLE transactions ADD COLUMN referenceId TEXT;
      CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(referenceId);
    `,
    down: `
      -- SQLite doesn't support dropping columns directly, so we need to use a workaround
      CREATE TABLE transactions_backup (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebaseId TEXT UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        fromAccount TEXT,
        toAccount TEXT,
        userId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending'
      );
      
      INSERT INTO transactions_backup 
      SELECT id, firebaseId, type, amount, description, category, date, fromAccount, toAccount, userId, createdAt, updatedAt, syncStatus
      FROM transactions;
      
      DROP TABLE transactions;
      ALTER TABLE transactions_backup RENAME TO transactions;
      
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(userId, date DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_sync ON transactions(syncStatus);
    `
  },
  {
    version: 3,
    name: 'add_receipts_attachment_support',
    up: `
      -- Add support for multiple receipt images and attachments
      CREATE TABLE IF NOT EXISTS receipt_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receiptId INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('image', 'pdf', 'other')),
        uri TEXT NOT NULL,
        filename TEXT NOT NULL,
        size INTEGER,
        createdAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending',
        FOREIGN KEY (receiptId) REFERENCES receipts (id) ON DELETE CASCADE
      );
      
      -- Add index for fast lookups
      CREATE INDEX IF NOT EXISTS idx_receipt_attachments_receipt ON receipt_attachments(receiptId);
    `,
    down: `
      DROP TABLE IF EXISTS receipt_attachments;
    `
  },
  {
    version: 4,
    name: 'add_sync_queue_table',
    up: `
      -- Create a dedicated sync queue for improved offline/online transition
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entityType TEXT NOT NULL CHECK (entityType IN ('expense', 'receipt', 'goal', 'transaction', 'wallet')),
        entityId INTEGER NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
        data TEXT,
        priority INTEGER DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        lastAttempt TEXT,
        createdAt TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'error')) DEFAULT 'pending',
        errorMessage TEXT
      );
      
      -- Add indexes for sync queue processing
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, priority);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entityType, entityId);
    `,
    down: `
      DROP TABLE IF EXISTS sync_queue;
    `
  },
  {
    version: 5,
    name: 'add_expense_tags_support',
    up: `
      -- Create tags table
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(userId, name)
      );
      
      -- Create expense-tag relationship table
      CREATE TABLE IF NOT EXISTS expense_tags (
        expenseId INTEGER NOT NULL,
        tagId INTEGER NOT NULL,
        PRIMARY KEY (expenseId, tagId),
        FOREIGN KEY (expenseId) REFERENCES expenses (id) ON DELETE CASCADE,
        FOREIGN KEY (tagId) REFERENCES tags (id) ON DELETE CASCADE
      );
      
      -- Add indexes
      CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(userId);
      CREATE INDEX IF NOT EXISTS idx_expense_tags_tag ON expense_tags(tagId);
    `,
    down: `
      DROP TABLE IF EXISTS expense_tags;
      DROP TABLE IF EXISTS tags;
    `
  }
];
