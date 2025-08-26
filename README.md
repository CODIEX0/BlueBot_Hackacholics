# BlueBot - Intelligent Financial Assistant

BlueBot is a comprehensive React Native financial assistant app with **mobile-first, offline-first architecture** designed specifically for both banked and unbanked users in South Africa. The app features SQLite-based local storage, biometric authentication, and cloud synchronization when online.

## 🚀 Mobile-First Architecture

This app uses a **mobile-first, offline-first** architecture that prioritizes local data storage and authentication over cloud dependencies:

### Key Mobile Features
- **Local SQLite Database**: All user data, expenses, and receipts stored locally
- **Biometric Authentication**: Fingerprint, Face ID, and local password authentication  
- **Offline-First**: Full functionality without internet connection
- **Cloud Sync**: Automatic synchronization with Firebase when online
- **Advanced Security**: Local authentication with optional cloud backup

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
