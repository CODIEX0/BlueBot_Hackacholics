/**
 * AWS Configuration
 * Central configuration for all AWS services
 */

// AWS Configuration from environment variables
const awsConfig = {
  region: process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
};

// Table Names
export const TABLE_NAMES = {
  USERS: process.env.EXPO_PUBLIC_DYNAMODB_USERS_TABLE || 'BlueBot-Users',
  EXPENSES: process.env.EXPO_PUBLIC_DYNAMODB_EXPENSES_TABLE || 'BlueBot-Expenses',
  BUDGETS: process.env.EXPO_PUBLIC_DYNAMODB_BUDGETS_TABLE || 'BlueBot-Budgets',
  TRANSACTIONS: process.env.EXPO_PUBLIC_DYNAMODB_TRANSACTIONS_TABLE || 'BlueBot-Transactions',
  USER_PROGRESS: process.env.EXPO_PUBLIC_DYNAMODB_USER_PROGRESS_TABLE || 'BlueBot-UserProgress',
  CHAT_SESSIONS: process.env.EXPO_PUBLIC_DYNAMODB_CHAT_SESSIONS_TABLE || 'BlueBot-ChatSessions',
  RECEIPTS: process.env.EXPO_PUBLIC_DYNAMODB_RECEIPTS_TABLE || 'BlueBot-Receipts',
};

// Cognito Configuration
export const COGNITO_CONFIG = {
  userPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID || '',
  clientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || '',
  region: awsConfig.region,
};

// Bedrock Configuration
export const BEDROCK_CONFIG = {
  modelId: process.env.EXPO_PUBLIC_BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
  region: awsConfig.region,
};

// S3 Configuration for receipt storage
export const S3_CONFIG = {
  // Support both names; prefer receipts-specific variable
  bucketName: process.env.EXPO_PUBLIC_S3_RECEIPTS_BUCKET 
    || process.env.EXPO_PUBLIC_AWS_S3_BUCKET 
    || 'bluebot-receipts',
  region: awsConfig.region,
};

export default {
  awsConfig,
  TABLE_NAMES,
  COGNITO_CONFIG,
  BEDROCK_CONFIG,
  S3_CONFIG,
};
