# BlueBot - Core Features Summary

## Overview
BlueBot is a focused financial assistant application designed specifically for Standard Bank customers. The application has been streamlined to include only essential features that provide real value to users.

## Core Features

### 1. BlueBot AI Assistant (`/ai-chat`)
- **Purpose**: Intelligent financial advisor and personal assistant
- **Technology**: AWS Bedrock for AI processing
- **Features**:
  - Natural language financial advice
  - Expense categorization suggestions
  - Budget recommendations
  - Financial goal planning assistance
  - Standard Bank product information

### 2. Financial Learning (`/learn`)
- **Purpose**: Interactive financial education
- **Features**:
  - Structured financial curriculum
  - Progress tracking
  - Gamification elements
  - Age-appropriate content
  - Standard Bank product education

### 3. Dashboard (`/index`)
- **Purpose**: Overview of financial health
- **Features**:
  - Budget progress visualization
  - Expense summaries
  - Financial goals tracking
  - Quick actions (add expenses, scan receipts)
  - Standard Bank account integration

### 4. Receipt Scanning (`/scan-receipt`)
- **Purpose**: Automated expense tracking
- **Technology**: AWS Textract for OCR
- **Features**:
  - Camera-based receipt capture
  - Automatic text extraction
  - Smart categorization
  - Expense amount detection

### 5. Budget Management (`/add-expense`)
- **Purpose**: Manual expense tracking and budget control
- **Features**:
  - Category-based expense entry
  - Budget vs actual comparisons
  - Visual progress indicators
  - Smart categorization suggestions

### 6. User Profile (`/profile`)
- **Purpose**: Account management and settings
- **Technology**: AWS Cognito for authentication
- **Features**:
  - User information display
  - Biometric settings
  - Security preferences
  - Standard Bank account linking

## Technology Stack

### Frontend
- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **UI Components**: React Native Paper
- **Charts**: Victory Native

### Backend Services
- **Authentication**: AWS Cognito
- **Database**: AWS DynamoDB
- **AI Processing**: AWS Bedrock
- **OCR**: AWS Textract
- **File Storage**: AWS S3

### Key Services
- `AWSServiceManager`: Central AWS service coordination
- `BlueBotAI`: AI conversation handling
- `StandardBankService`: Core business logic for Standard Bank features
- `curriculumService`: Educational content management
- `receiptOCR_Production`: Receipt processing

## Removed Features
The following features have been removed to focus on core functionality:
- Cryptocurrency wallet integration
- Payment processing systems
- WhatsApp integration
- Firebase services
- Social features
- Third-party integrations (non-Standard Bank)

## File Structure
```
app/
├── (auth)/           # Authentication screens
├── (tabs)/           # Main app tabs (Dashboard, Learn, BlueBot, Profile)
├── ai-chat.tsx       # AI assistant
├── scan-receipt.tsx  # Receipt scanning
├── add-expense.tsx   # Manual expense entry
└── financial-education.tsx # Learning module

services/
├── AWSServiceManager.ts     # AWS service coordination
├── BlueBotAI.ts            # AI processing
├── StandardBankService.ts   # Core business logic
├── curriculumService.ts    # Education content
└── receiptOCR_Production.ts # OCR processing

contexts/
├── AWSContext.tsx          # AWS service context
├── GamificationContext.tsx # Learning gamification
└── ThemeContext.tsx        # UI theming
```

## Standard Bank Integration
- Customer account information
- Product recommendations
- Financial planning tools
- South African Rand (ZAR) currency support
- Local banking regulations compliance

## Security Features
- AWS Cognito authentication
- Biometric login support
- Secure data encryption
- Local data protection
- Session management

## Demo Mode
The application includes a comprehensive demo mode that allows testing all features without requiring AWS credentials or Standard Bank account access.

## Deployment
The application is configured for:
- Android APK/AAB builds
- iOS App Store builds
- Web deployment
- Standard Bank app store integration

## Future Enhancements
1. Enhanced AI financial planning
2. Advanced budget analytics
3. Integration with Standard Bank APIs
4. Expanded educational content
5. Improved receipt processing accuracy

This streamlined version of BlueBot focuses on delivering maximum value to Standard Bank customers through essential financial management tools powered by modern cloud technologies.
