# AWS Setup Guide

This guide shows how to configure AWS services and environment variables for BlueBot.

## 1) Create AWS resources

- Cognito User Pool: enable email sign-in; create App Client (no secret) and capture:
  - User Pool ID -> EXPO_PUBLIC_COGNITO_USER_POOL_ID
  - App Client ID -> EXPO_PUBLIC_COGNITO_CLIENT_ID
- DynamoDB Tables (PKs suggested; add GSI for userId where noted):
  - Users (PK: userId)
  - Expenses (PK: expenseId) + GSI: userId-index (PK: userId)
  - Budgets (PK: budgetId) + GSI: userId-index (PK: userId)
  - Transactions (PK: transactionId) + GSI: userId-index (PK: userId)
  - UserProgress (PK: userId)
  - ChatSessions (PK: sessionId)
  - Receipts (PK: receiptId)
- S3 Bucket for receipts:
  - Name the bucket and set CORS for mobile/web uploads as needed
- Bedrock (optional):
  - Enable Bedrock regionally and choose a model ID (e.g., Claude Sonnet)

## 2) IAM

Create an IAM user or role with least-privilege access to Cognito, DynamoDB tables, Textract, S3, and Bedrock as required for your environment. Export credentials to your app via env variables. Prefer Cognito identity pools or secure backend proxies for production.

## 3) Environment variables

Copy `.env.example` to `.env` and fill values:

Required:
- EXPO_PUBLIC_AWS_REGION
- EXPO_PUBLIC_AWS_ACCESS_KEY_ID
- EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY

Recommended:
- EXPO_PUBLIC_COGNITO_USER_POOL_ID
- EXPO_PUBLIC_COGNITO_CLIENT_ID
- EXPO_PUBLIC_S3_RECEIPTS_BUCKET
- EXPO_PUBLIC_BEDROCK_MODEL_ID
- Table names if you customized them

Note: EXPO_PUBLIC_* variables are exposed to the client. Do not embed long-lived secrets in production builds. For production, use Cognito Federated Identities or a secure API to sign requests.

## 4) App wiring

- Config: `config/aws.ts` reads EXPO_PUBLIC_* envs
- Services: `services/AWSServiceManager.ts` picks up config/env for region/creds
- Context: `contexts/AWSContext.tsx` orchestrates auth/data/AI using the service manager

## 5) Run

1) Install deps: npm install
2) Create and fill `.env`
3) Start: npm start

If some services are not yet provisioned, the app will run in demo/mocked mode while still compiling.

## 6) DynamoDB Indexes

For query APIs to work, create GSI `userId-index` on Expenses, Budgets, and Transactions with partition key `userId`.

## Troubleshooting

- Missing env: ensure `.env` exists and variables are prefixed EXPO_PUBLIC_*
- CORS/S3 upload: configure CORS or use pre-signed URLs from a backend
- Credentials: avoid hardcoding long-lived keys in mobile apps; prefer short-lived tokens
