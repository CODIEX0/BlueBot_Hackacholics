# BlueBot – Intelligent Financial Assistant (Hackathon Edition)

BlueBot is an AWS‑centric, privacy‑aware financial wellness assistant built with Expo (React Native + TypeScript). It unifies budgeting, AI coaching, receipt intelligence, gamified learning, and (planned) pre‑qualification of Standard Bank products. This README reflects the streamlined, production‑lean direction (legacy Firebase + crypto wallet code removed) and the focused Hackathon roadmap.

## ⚡ Executive Pitch
Empower Standard Bank customers with a proactive, AI‑orchestrated financial wellbeing companion: real spending intelligence, adaptive budget recommendations, receipt OCR, contextual education, and upcoming smart product matching — all wrapped in POPIA‑respectful data controls.

## 🔑 Differentiators
- MultiAI Orchestration: Automatic cascade across multiple model providers (Bedrock / Anthropic / OpenAI / Gemini / DeepSeek / HuggingFace / OpenRouter) with health + rate‑limit fallback.
- Financial Wellbeing Layer (in progress): Holistic score derived from spending balance, savings velocity, category concentration, and goal progress.
- Intelligent Budget Recommendations (planned): Data‑driven baseline + AI narrative explanation.
- Product Marketplace (planned): Lightweight eligibility + pre‑qualification rationale for banking products.
- POPIA Privacy Center (expanding): Granular toggles for data sharing & AI personalization redaction.
- Unified Global Balance: Single persisted source of truth (BalanceContext) used across dashboards, chat, and analytics.
- South African Localization: Local currency (ZAR), contextual financial education, emerging multilingual voice & speech support.

## ✅ Current Implemented Core
| Domain | Status | Highlights |
|--------|--------|------------|
| AI Chat | Implemented | MultiAI fallback, temperature control, provider health checks, privacy redaction, per‑message TTS (pause/resume/stop), selectable voices incl. SA variants |
| Balance Consistency | Implemented | `BalanceContext` with AsyncStorage persistence + seeding from user data |
| Expense Tracker | Enhanced | Category filters, search, recurring flag, CSV export, budget progress visuals |
| Receipt Scanning | Scaffolded | Component + AWS Textract service abstraction ready (production OCR integration pending) |
| Financial Education | Implemented | Curriculum ingestion + gamification context |
| Gamification | Implemented | Points & achievements scaffolding |
| Privacy Toggle | Implemented | Data sharing consent affects AI prompt context |
| AWS Service Layer | Partial | DynamoDB / Textract / Cognito service abstractions present (some mocked pathways) |

## 🎯 Hackathon Feature Roadmap (Focused 5)
| Feature | Status | Next Step |
|---------|--------|-----------|
| Financial Wellbeing Score | Designing | Implement scorer module + UI widget (`WellbeingScoreCard`) |
| Intelligent Budget Recommendations | Planned | Aggregate last 30d spend → baseline allocations → AI explanation |
| Product Marketplace & Pre‑Qualification | Planned | Extend `StandardBankService` with rule engine + new `products.tsx` screen |
| POPIA Privacy Center (Granular) | Planned | Dedicated screen: AI Personalization, Analytics, Marketing, Auto‑Import toggles |
| Account Integration Layer (Simulated) | Planned | Mock account + transaction ingestion feeding expenses (future open banking) |

## 🧱 Architecture Overview
Client (Expo RN) → Context Providers → Service Layer → (AWS / External AI Providers)

Key Contexts:
- `AWSContext` – session + backend service access
- `BalanceContext` – unified financial balance (persistent)
- `GamificationContext` – points & achievements
- `ThemeContext` – theming

Service Layer Highlights:
- `MultiAI` & `BlueBotAI` – provider selection, fallback sequencing, privacy redaction
- `AWSDynamoDBService`, `AWSCognitoService`, `AWSTextractService`, `AWSBedrockService`
- `StandardBankService` – product catalogue + (upcoming) eligibility logic

Planned Additions:
- `WellbeingScoreService` – scoring algorithm & historical snapshots
- `BudgetRecommendationService` – statistical + AI hybrid suggestions
- `PrivacyCenterService` – consolidated consent state
- `AccountAggregationService` – mock ingestion pipeline

## 🧮 Financial Wellbeing Score (Design Outline)
Inputs (initial set):
1. Spending Efficiency: (Planned Budget vs Actual) variance normalization
2. Savings Momentum: (Savings / Income) trend (approx. via goals + balance delta)
3. Category Diversification: Herfindahl index of discretionary vs essentials
4. Goal Progress: Weighted completion % of active goals
5. Recurring vs One‑off Ratio: Healthy baseline threshold

Score Pipeline (0–100): weight -> normalize -> clamp -> composite -> grade (A–E). Stored periodically for trend line.

## 🤖 MultiAI Orchestration
Fallback chain example: User provider → Health Checked List (e.g., Bedrock → Anthropic → OpenAI → Gemini → HuggingFace) → Local/mock. Automatic skip on 429 / timeout. Temperature & persona adjustable; privacy redaction strips PII when consent disabled.

## 📊 Data & Persistence
- Local: AsyncStorage (settings, balance), SQLite (expenses – extendable), future migration path to DynamoDB streams.
- Cloud (planned/partial): DynamoDB for expenses/goals, S3 for receipt images, Textract for OCR, Cognito for auth, Bedrock for AI (where available regionally).

## 🔐 Privacy & POPIA
Privacy Center will expose:
- AI Personalization (on/off)
- Data Sharing with Model Providers
- Analytics Telemetry
- Product Recommendation Personalization
- Auto Transaction Import (future)

When disabled, prompts redact: names, merchants, transaction memos, free‑text notes (hashed placeholders). All PII boundaries enforced client‑side before outbound requests.

## 🛠 Technology Stack
Frontend: Expo (React Native), TypeScript, expo-router, AsyncStorage, Voice / Speech APIs
AI Providers (configurable): Bedrock, OpenAI, Anthropic, Gemini, DeepSeek, HuggingFace, OpenRouter
AWS: Cognito, DynamoDB, S3, Textract, (Bedrock), CloudWatch (planned logging), IAM
Testing: Jest, React Native Testing Library (extendable), typed strict TS
Tooling: Metro bundler, Babel, EAS (optional)

## ⚙️ Environment Variables (.env)
```
# AWS
EXPO_PUBLIC_AWS_REGION=eu-west-1
EXPO_PUBLIC_AWS_USER_POOL_ID=xxxx
EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID=xxxx
EXPO_PUBLIC_AWS_IDENTITY_POOL_ID=xxxx
EXPO_PUBLIC_AWS_TEXTRACT_ROLE_ARN=arn:aws:iam::xxxx:role/BlueBotTextract
EXPO_PUBLIC_AWS_S3_BUCKET=bluebot-receipts-dev

# AI Providers (only set what you use)
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
EXPO_PUBLIC_ANTHROPIC_API_KEY=...
EXPO_PUBLIC_GEMINI_API_KEY=...
EXPO_PUBLIC_DEEPSEEK_API_KEY=...
EXPO_PUBLIC_HUGGINGFACE_API_KEY=hf_...
EXPO_PUBLIC_OPENROUTER_API_KEY=or_...

# Feature Flags (planned)
EXPO_PUBLIC_ENABLE_WELLBEING=true
EXPO_PUBLIC_ENABLE_MARKETPLACE=false
```

## 🚀 Getting Started
1. Install deps: `npm install`
2. Create `.env` (see above)
3. Run: `npm start`
4. Choose target (iOS / Android / Web) via Expo interface

Testing:
```
npm test
```

Type Check:
```
npm run typecheck
```

## 🧪 Testing Strategy (Summary)
- Unit: Pure functions & service fallbacks
- Integration: AI chat flow, expense CRUD
- Snapshot (select): UI stability for critical cards (coming)
- Future: Scoring algorithm boundary tests, recommendation drift tests

## 🔧 Development Notes
- Global balance edits via Expenses Balance tab or Dashboard quick action propagate instantly.
- Provider fallback order configurable (future external config).
- CSV export produces shareable spending snapshot (no PII beyond categories + amounts if privacy redaction active).

## 📈 Planned Iterations (Quarterly View)
| Quarter | Focus | Outcomes |
|---------|-------|----------|
| Q3 2025 | Hackathon Delivery | Wellbeing Score MVP, Budget AI Recs, Privacy Center screen |
| Q4 2025 | Productization | Marketplace + pre‑qualification, mock account ingestion, telemetry dashboards |
| Q1 2026 | Scale & Compliance | Open Banking connectors, audit logging, encryption hardening |

## 🛡 Security Snapshot
- Client-side redaction before AI calls
- Principle of least privilege IAM (recommended templates in `docs/AWS_SETUP.md`)
- No crypto wallet / on‑device private key handling (removed)
- Pending: centralized error observability (CloudWatch + structured logs)

## 🗃 Data Model (Current Essentials)
| Entity | Key Fields | Notes |
|--------|-----------|-------|
| Expense | id, amount, category, date, recurring | CSV export & budget aggregation |
| Balance | currentBalance, lastUpdated | Stored AsyncStorage (`bb.balance`) |
| Goal (planned extension) | id, targetAmount, progress | Feeding wellbeing score |
| Receipt (planned) | id, s3Key, fieldsExtracted | Output of Textract pipeline |

## 🧩 Extensibility Hooks
- Add AI Provider: Implement provider adapter in `MultiAI` registry.
- Add Score Dimension: Extend `WellbeingScoreService` weights & normalization map.
- Add Marketplace Rule: Append to `StandardBankService` eligibility evaluators.

## 🧑‍💻 Contribution (Hackathon Mode)
Please keep PRs concise: feature slice + tests + docs delta. Use conventional commits (`feat:`, `fix:`, `docs:`...).

## 🗑 Legacy Removed / Deprecated
- Crypto wallet (addresses, QR payments, token pricing)
- Heavy Firebase-first offline auth model (replaced with AWS-focused approach)
- Redundant duplicate README sections

## 📄 License
MIT License – see `LICENSE` (proprietary indicators removed for clarity).

## 🙏 Acknowledgments
South African financial ecosystem & developer community. Open‑source AI model providers. Contributors iterating toward a safer, smarter banking assistant.

---
Built with focus on financial wellbeing, transparency, and adaptability.

## 🌟 Core Features

### 🧠 BlueBot AI Assistant
- **AWS Bedrock Integration**: Powered by Amazon's AI services for intelligent financial advice
- **South African Context**: Tailored advice for Standard Bank customers and local economic conditions
- **Budget Analysis**: AI-powered insights into spending patterns and budget optimization
- **Personalized Recommendations**: Custom financial advice based on user behavior and goals
- **Natural Language Processing**: Interactive chat interface with voice interaction support

### 📊 Smart Budget Management
- **AWS DynamoDB Storage**: Secure, scalable cloud storage for all financial data
- **Expense Tracking**: Comprehensive expense logging with intelligent categorization
- **Budget Creation**: Set and monitor monthly/weekly budgets with progress tracking
- **Spending Analytics**: Visual insights with charts and trends
- **Goal Setting**: Create and track savings goals with progress indicators

### 📸 Receipt Scanning & OCR
- **AWS Textract Integration**: Advanced OCR processing for South African receipts
- **Automatic Data Extraction**: Extract amount, date, merchant, and items from receipts
- **Smart Categorization**: AI-powered expense categorization
- **Multi-format Support**: Physical receipts via camera and digital receipt uploads
- **Expense Validation**: Automatic verification and duplicate detection

### 🎓 Financial Education Platform
- **Interactive Learning**: Comprehensive financial literacy courses
- **South African Focus**: Content tailored for local banking and economic landscape
- **Progress Tracking**: Complete course progress with achievements
- **Quizzes & Assessments**: Interactive learning with immediate feedback
- **Certification**: Digital certificates for completed courses

### 👤 User Profile & Settings
- **AWS Cognito Authentication**: Secure authentication with multi-factor support
- **Profile Management**: Personal information and preferences
- **Security Settings**: Biometric authentication and security preferences
- **Account Insights**: Overview of financial health and account summary
- **Customization**: Personalized app experience and notifications

### � Dashboard Overview
- **Financial Summary**: Quick overview of account balance, expenses, and budgets
- **Recent Transactions**: Latest expense entries and receipt scans
- **Budget Progress**: Visual budget tracking with spending alerts
- **Quick Actions**: Fast access to common features like adding expenses or scanning receipts
- **AI Insights**: Personalized financial tips and recommendations

## 🛠 Technology Stack

### Frontend
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build tools
- **TypeScript**: Type-safe JavaScript development
- **React Navigation**: Navigation library
- **Expo Linear Gradient**: Gradient styling
- **React Native Chart Kit**: Data visualization

### AWS Services
- **AWS DynamoDB**: NoSQL database for user data and transactions
- **AWS Cognito**: User authentication and authorization
- **AWS Textract**: OCR processing for receipt scanning
- **AWS Bedrock**: AI services for BlueBot assistant
- **AWS S3**: File storage for receipts and documents

### Additional Services
- **Expo Camera**: Camera functionality for receipt scanning
- **React Native Voice**: Voice interaction capabilities
- **AsyncStorage**: Local data persistence

## 📱 Supported Platforms

- **iOS**: iPhone and iPad
- **Android**: Android 8.0+ (API level 26+)
- **Web**: Progressive Web App support

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development on macOS)
- AWS Account with configured services

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/standard-bank/bluebot-app.git
   cd bluebot-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy `.env.example` to `.env` and fill values. See `docs/AWS_SETUP.md` for full AWS setup.

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/emulator**
   ```bash
   # iOS Simulator
   npm run ios
   
   # Android Emulator
   npm run android
   
   # Web browser
   npm run web
   ```

### AWS Setup

Refer to `docs/AWS_SETUP.md` for complete steps. Summary:

1. **DynamoDB Tables**
   - Users table with GSI for email lookup
   - Expenses table with GSI for user queries
   - Budgets table for budget tracking
   - Goals table for savings goals
   - Receipts table for scanned documents

2. **Cognito User Pool**
   - Email/Phone authentication
   - MFA configuration
   - Custom attributes for Standard Bank integration

3. **S3 Bucket**
   - Receipt image storage
   - Document uploads
   - Proper IAM policies for secure access

4. **Textract Configuration**
   - Receipt analysis configuration
   - South African document templates
   - Custom data extraction rules

## 📂 Project Structure

```
bluebot/
├── app/                          # Expo Router pages
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Dashboard
│   │   ├── add-expense.tsx       # Add expenses
│   │   ├── ai-chat.tsx           # AI assistant
│   │   ├── financial-education.tsx # Learning platform
│   │   └── profile.tsx           # User profile
│   ├── scan-receipt.tsx          # Receipt scanning
│   ├── privacy-policy.tsx        # Privacy policy
│   ├── terms-conditions.tsx      # Terms of service
│   └── _layout.tsx               # Root layout
├── components/                   # Reusable UI components
│   ├── BudgetProgress.tsx        # Budget tracking
│   ├── FinancialInsights.tsx     # Financial analytics
│   ├── ReceiptScanner.tsx        # Receipt scanning
│   ├── CurriculumBasedEducation.tsx # Education platform
│   └── GlassCard.tsx             # UI components
├── contexts/                     # React Context providers
│   ├── AWSContext.tsx            # AWS services integration
│   ├── ThemeContext.tsx          # App theming
│   └── GamificationContext.tsx   # Learning achievements
├── services/                     # Business logic services
│   ├── AWSDynamoDBService.ts     # Database operations
│   ├── AWSTextractService.ts     # OCR processing
│   ├── AWSCognitoService.ts      # Authentication
│   ├── AWSBedrockService.ts      # AI assistant
│   ├── AWSServiceManager.ts      # Service coordination
│   ├── curriculumService.ts      # Education content
│   └── educationService.ts       # Learning platform
├── data/                         # Static data files
│   └── financial-education-curriculum.json # Education content
├── config/                       # Configuration files
│   └── theme.ts                  # App theming
└── types/                        # TypeScript definitions
    └── index.ts                  # Type definitions
```

## 🔧 Configuration

### Environment Variables
All AWS services must be properly configured with appropriate credentials and permissions.

### App Configuration
Edit `app.json` to customize app settings:

```json
{
  "expo": {
    "name": "BlueBot",
    "slug": "bluebot-standard-bank",
    "version": "1.0.0",
    "platforms": ["ios", "android", "web"],
    "permissions": [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "RECORD_AUDIO"
    ]
  }
}
```

## 🔒 Security Features

### Data Protection
- **AWS Security**: All data secured with AWS best practices
- **Encryption**: Data encrypted in transit and at rest
- **Authentication**: Multi-factor authentication via AWS Cognito
- **Authorization**: Role-based access control

### Standard Bank Integration
- **Secure APIs**: Integration with Standard Bank systems
- **Customer Data**: Secure handling of bank customer information
- **Compliance**: Adherence to banking security standards
- **Audit Logging**: Complete audit trail for all operations

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Manual Testing Checklist
- [ ] User registration and authentication
- [ ] Receipt scanning and data extraction
- [ ] Budget creation and tracking
- [ ] AI chat functionality
- [ ] Financial education progress
- [ ] Profile management

## 🚀 Deployment

### Development Build
```bash
expo build:android
expo build:ios
```

### Production Build
```bash
# Android
expo build:android --type app-bundle

# iOS
expo build:ios --type archive
```

## 📈 Roadmap

### Version 1.1
- [ ] Enhanced AI capabilities
- [ ] Advanced budget analytics
- [ ] Integration with Standard Bank accounts
- [ ] Expanded financial education content

### Version 1.2
- [ ] Investment tracking
- [ ] Advanced goal setting
- [ ] Social features for financial education
- [ ] Enhanced receipt processing

## 📄 License

This project is proprietary software developed for Standard Bank customers.

## 📞 Support

### Contact
- Email: support@standardbank.co.za
- Website: https://standardbank.co.za/bluebot
- Support Portal: Standard Bank customer support

---

**Built for Standard Bank customers with ❤️**

## 🌟 Features

### 🔐 Mobile-First Authentication
- **Local Authentication**: Biometric (fingerprint/Face ID) and password-based login
- **Offline Login**: Full authentication without internet connection
- **Multi-method Registration**: Phone number, email, Google Sign-In, passwordless email
- **Secure Local Storage**: Authentication data stored securely on device
- **Cloud Sync**: Authentication state synced with Firebase when online
- **reCAPTCHA Integration**: Bot protection for online registration
- **POPIA Compliance**: Full compliance with South African data protection laws

### 🧠 AI Financial Assistant (BlueBot)
- **DeepSeek Integration**: Powered by DeepSeek LLM API for intelligent responses
- **South African Context**: Tailored advice for local economic conditions
- **Context-Aware Responses**: References user expenses, goals, and financial data
- **Multi-language Support**: English with local terminology
- **Real-time Chat**: Interactive chat interface with suggestions and actions

### 📊 Offline-First Expense Tracker with Receipt Scanning
- **Local SQLite Storage**: All data stored locally first, synced to cloud when online
- **Manual Entry**: Easy expense logging with categorization (works offline)
- **Receipt Scanning**: 
  - Physical receipts using expo-camera + Tesseract.js OCR
  - Digital receipts using expo-document-picker
- **Smart Categorization**: Automatic expense categorization
- **Visual Analytics**: Pie charts and trend graphs with react-native-chart-kit
- **Sync Queue**: Changes queued locally and synchronized when connection available

### 🎯 Goal-Based Savings Vaults
- **Custom Goals**: Set personalized savings targets
- **Progress Tracking**: Visual progress indicators
- **Goal Locking**: Optional fund locking until goals are reached
- **Multi-currency Support**: ZAR, USD, and crypto options
- **Automated Savings**: Scheduled transfers and debit orders

### 🧠 Financial Literacy Micro-Courses
- **Comprehensive Content**: Courses on budgeting, credit, crypto basics, and saving
- **South African Focus**: Content tailored for local financial landscape
- **Interactive Learning**: Quizzes, videos, and interactive exercises
- **Progress Tracking**: Complete course tracking with certificates
- **Gamification**: Points, badges, and achievements for learning milestones

### 🪙 Crypto Wallet for Unbanked Users
- **Ethereum Compatible**: Support for ETH, USDC, USDT
- **Secure Generation**: Cryptographically secure wallet creation
- **QR Code Integration**: Easy send/receive via QR codes
- **Phone Number Mapping**: Send funds using phone numbers
- **Exchange Rate Display**: Real-time crypto to ZAR conversion
- **Transaction History**: Complete transaction tracking

### 📱 WhatsApp & QR Integration
- **QR Payments**: Generate and scan QR codes for payments
- **WhatsApp Bot**: Optional WhatsApp integration for balance checks
- **Merchant Payments**: QR code payments to merchants
- **P2P Transfers**: Person-to-person payments via QR

### 🎮 Gamification & Rewards
- **Achievement System**: Unlock badges for various milestones
- **XP System**: Earn experience points for app usage
- **Level Progression**: Advance through financial literacy levels
- **Daily Challenges**: Complete tasks for bonus rewards
- **Leaderboards**: Compare progress with other users
- **Streak Tracking**: Maintain usage streaks for bonuses

## 🛠 Technology Stack

### Frontend
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **TypeScript**: Type-safe JavaScript
- **React Navigation**: Navigation library
- **Lucide React Native**: Icon library
- **Expo Linear Gradient**: Gradient styling

### Backend & Storage
- **Firebase**: Authentication and cloud storage
- **SQLite**: Local database for offline functionality
- **AsyncStorage**: Local key-value storage
- **Expo Secure Store**: Secure credential storage

### AI & ML
- **DeepSeek API**: Large language model for AI assistant
- **Hugging Face Inference API**: Optional free-tier friendly provider
- **Tesseract.js**: OCR for receipt scanning
- **Custom NLP**: Text processing for financial insights

### Crypto & Payments
- **Ethers.js**: Ethereum blockchain interaction
- **Web3 Libraries**: Blockchain connectivity
- **QR Code Libraries**: Payment QR code generation

### Analytics & Visualization
- **React Native Chart Kit**: Financial charts and graphs
- **Victory Native**: Advanced data visualization
- **Custom Analytics**: Spending pattern analysis

## 📱 Supported Platforms

- **iOS**: iPhone and iPad
- **Android**: Android 8.0+ (API level 26+)
- **Web**: Progressive Web App support

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development on macOS)
- Firebase project setup (optional for cloud sync)
- DeepSeek API key (optional for AI features)
- Hugging Face API key (optional; enables free-tier friendly AI)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/bluebot-app.git
   cd bluebot-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Firebase (optional for cloud sync)
   EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   
   # Google Sign-In
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_client_id
   
   # reCAPTCHA
   EXPO_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
   
   # AI Features (optional)
   EXPO_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   EXPO_PUBLIC_HUGGINGFACE_API_KEY=hf_xxx_your_token
   # Optional: override default model
   EXPO_PUBLIC_HF_MODEL=mistralai/Mistral-7B-Instruct-v0.3
   ```

4. **Configure Firebase (Optional for cloud sync)**
   - Create a new Firebase project
   - Enable Authentication (Email/Password, Phone, Google Sign-In)
   - Enable Firestore Database
   - Download and place configuration files:
     - `google-services.json` for Android
     - `GoogleService-Info.plist` for iOS

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Run on device/emulator**
   ```bash
   # iOS Simulator
   npm run ios
   
   # Android Emulator
   npm run android
   
   # Web browser
   npm run web
   ```

### Firebase Setup

1. **Authentication**
   - Enable Email/Password authentication
   - Enable Phone authentication (requires additional setup)
   - Configure authorized domains

2. **Firestore Database**
   - Create a new database in production mode
   - Set up security rules from `database/firebase-rules.js`

3. **Storage Rules**
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /receipts/{userId}/{allPaths=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

### API Configuration

1. **DeepSeek API**
   - Sign up at [DeepSeek](https://platform.deepseek.com)
   - Get API key from dashboard
   - Add to environment variables

2. **Currency Exchange API**
3. **Hugging Face Inference API (Optional)**
   - Get a token at https://huggingface.co/settings/tokens
   - Add `EXPO_PUBLIC_HUGGINGFACE_API_KEY` to `.env`
   - Optionally set `EXPO_PUBLIC_HF_MODEL` to a supported chat/instruct model
   - In the AI Chat tab, use the provider switcher to select “Hugging Face”

   - Optional: Add currency exchange API for real-time rates
   - Recommended: CoinGecko API (free tier available)

## 📂 Project Structure

```
bluebot/
├── app/                          # Expo Router pages
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx            # Basic login
│   │   ├── enhanced-login.tsx   # Advanced login with biometrics
│   │   ├── register.tsx         # User registration
│   │   ├── enhanced-register.tsx # Advanced registration
│   │   ├── forgot-password.tsx  # Password recovery
│   │   └── verify-otp.tsx       # OTP verification
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Dashboard
│   │   ├── expenses.tsx          # Expense tracking
│   │   ├── wallet.tsx            # Wallet & payments
│   │   ├── ai-chat.tsx           # AI assistant
│   │   └── profile.tsx           # User profile
│   ├── privacy-policy.tsx        # POPIA compliance
│   ├── terms-conditions.tsx      # Terms of service
│   └── _layout.tsx               # Root layout with mobile contexts
├── components/                   # Reusable UI components
│   ├── BudgetProgress.tsx
│   ├── FinancialInsights.tsx
│   ├── BiometricSettings.tsx     # Biometric configuration
│   ├── RecaptchaComponent.tsx    # reCAPTCHA integration
│   └── ...
├── contexts/                     # React Context providers
│   ├── MobileAuthContext.tsx     # Mobile-first authentication
│   ├── MobileDatabaseContext.tsx # SQLite database with sync
│   ├── AuthContext.tsx           # Legacy Firebase authentication
│   ├── DatabaseContext.tsx       # Legacy Firebase database
│   ├── WalletContext.tsx         # Wallet functionality
│   └── GamificationContext.tsx   # Achievements & XP
├── services/                     # Business logic services
│   ├── BlueBotAI.ts              # AI assistant service
│   ├── receiptOCR.ts             # Receipt scanning
│   ├── cryptoWallet.ts           # Crypto wallet
│   ├── educationService.ts       # Financial education
│   └── gamificationService.ts    # Rewards & achievements
├── database/                     # Database schemas & configs
│   ├── sqlite.ts                 # SQLite manager
│   └── firebase-rules.js         # Firestore security rules
├── utils/                        # Helper utilities
│   ├── currency.ts               # Currency formatting
│   └── dateHelpers.ts            # Date utilities
├── types/                        # TypeScript definitions
│   └── finance.ts                # Financial data types
└── config/                       # Configuration files
    └── firebase.ts               # Firebase initialization
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file with the following variables:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI Service
EXPO_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_key

# Optional APIs
EXPO_PUBLIC_COINGECKO_API_KEY=your_coingecko_key
EXPO_PUBLIC_EXCHANGE_RATE_API_KEY=your_exchange_api_key
```

### App Configuration
Edit `app.json` to customize app settings:

```json
{
  "expo": {
    "name": "BlueBot",
    "slug": "bluebot-finance",
    "version": "1.0.0",
    "platforms": ["ios", "android", "web"],
    "permissions": [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "USE_BIOMETRIC",
      "USE_FINGERPRINT"
    ]
  }
}
```

## 🔄 Mobile-First Data Management

### Local Storage (SQLite)
- **Primary Storage**: All data stored locally in SQLite database
- **Offline Access**: Full app functionality without internet
- **Security**: Local encryption with secure storage

### Database Tables:
- **users**: User profiles and authentication data
- **expenses**: All expense records with receipt data
- **receipts**: OCR-processed receipt information  
- **sync_queue**: Pending changes for cloud synchronization

### Cloud Synchronization
- **Automatic Sync**: When internet connection is available
- **Conflict Resolution**: Smart merging of concurrent changes
- **Backup & Restore**: Full data backup to Firebase
- **Cross-Device**: Sync data across multiple devices

### Sync Status Indicators:
- 🟢 **Online & Synced**: All data up to date
- 🟡 **Pending Sync**: Local changes waiting to upload
- 🔴 **Offline Mode**: No internet connection
- 🔵 **Syncing**: Data synchronization in progress

## 🔐 Authentication Methods

### Available Login Options:
1. **Biometric Authentication** (Primary)
   - Fingerprint recognition
   - Face ID (iOS) / Face Unlock (Android)
   - Works completely offline

2. **Local Password** (Primary)
   - Secure password stored on device
   - bcrypt hashing with salt
   - No internet required

3. **Google Sign-In** (Secondary)
   - OAuth 2.0 authentication
   - Requires internet connection
   - Syncs with local storage

4. **Passwordless Email** (Secondary)
   - Email-based authentication
   - reCAPTCHA protection
   - OTP verification

5. **Phone Authentication** (Secondary)
   - SMS OTP verification
   - International phone number support

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Manual Testing Checklist
- [ ] Offline user registration and login
- [ ] Biometric authentication setup and usage
- [ ] Expense tracking without internet connection
- [ ] Receipt scanning functionality
- [ ] Data synchronization when coming online
- [ ] Google Sign-In flow
- [ ] AI chat responses
- [ ] Crypto wallet creation and transactions
- [ ] Goal setting and progress tracking
- [ ] Cross-device data sync

## 🚀 Deployment

### Development Build
```bash
expo build:android
expo build:ios
```

### Production Build
```bash
# Android
expo build:android --type app-bundle

# iOS
expo build:ios --type archive
```

### App Store Deployment
1. **Google Play Store**
   - Generate signed APK/AAB
   - Upload to Google Play Console
   - Complete store listing
   - Submit for review

2. **Apple App Store**
   - Generate signed IPA
   - Upload via Xcode or Application Loader
   - Complete App Store Connect listing
   - Submit for review

## 📊 Analytics & Monitoring

### Built-in Analytics
- User engagement tracking
- Feature usage statistics
- Financial goal completion rates
- AI interaction analytics

### Error Monitoring
- Sentry integration for crash reporting
- Firebase Crashlytics for crash analytics
- Custom error logging for financial transactions

### Performance Monitoring
- Firebase Performance Monitoring
- React Native Performance monitoring
- Database query optimization

## 🔒 Security Features

### Data Protection
- **Encryption**: All sensitive data encrypted at rest
- **Secure Storage**: Credentials stored in device keychain
- **API Security**: All API calls authenticated and encrypted
- **Biometric Auth**: Fingerprint and face recognition support

### POPIA Compliance
- **Consent Management**: Clear consent flows for data collection
- **Data Rights**: User rights to access, correct, and delete data
- **Data Minimization**: Only collect necessary data
- **Audit Logging**: Complete audit trail for data access

### Financial Security
- **Transaction Verification**: Multi-factor authentication for transactions
- **Fraud Detection**: Anomaly detection for unusual spending patterns
- **Secure Communications**: End-to-end encryption for sensitive communications

## 🌍 Localization

### Supported Languages
- **English** (Primary)
- **Afrikaans** (Planned)
- **Zulu** (Planned)
- **Xhosa** (Planned)

### South African Customizations
- **Currency**: South African Rand (ZAR) as primary currency
- **Banking**: Integration with major SA banks
- **Regulations**: POPIA and NCR compliance
- **Local Content**: SA-specific financial education content

## 🤝 Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Use conventional commit messages
3. Add tests for new features
4. Update documentation for changes
5. Ensure POPIA compliance for data handling

### Code Style
- ESLint configuration provided
- Prettier for code formatting
- TypeScript strict mode enabled
- React Native best practices

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

### Documentation
- [API Documentation](docs/api.md)
- [User Guide](docs/user-guide.md)
- [Developer Guide](docs/developer-guide.md)

### Community
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Discord community server (link TBD)

### Contact
- Email: support@bluebot.co.za
- Website: https://bluebot.co.za
- Twitter: @BlueBotFinance

## 🙏 Acknowledgments

- South African Reserve Bank for regulatory guidance
- Firebase team for excellent backend services
- React Native community for continuous improvements
- DeepSeek for AI capabilities
- All beta testers and early adopters

## 📈 Roadmap

### Version 1.1 (Q2 2025)
- [ ] WhatsApp integration
- [ ] Advanced investment tracking
- [ ] Multi-bank account linking
- [ ] Enhanced AI capabilities

### Version 1.2 (Q3 2025)
- [ ] Business account features
- [ ] Tax preparation assistance
- [ ] Advanced analytics dashboard
- [ ] Social features and sharing

### Version 2.0 (Q4 2025)
- [ ] Open banking integration
- [ ] Advanced crypto features
- [ ] Machine learning insights
- [ ] International expansion

---

**Built with ❤️ for South Africa's financial future**
