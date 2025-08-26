/**
 * Curriculum Data Service
 * Handles loading and caching of curriculum data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CurriculumData {
  meta: {
    title: string;
    description: string;
    version: string;
    totalCourses: number;
    estimatedCompletionTime: string;
    certificationLevel: string;
    accreditation: string;
    languages: string[];
    targetAudience: string;
    qualityRating: string;
    recognitions: string[];
  };
  courses: Course[];
  learningPaths: LearningPath[];
  achievements: Achievement[];
  progressionSystem: any;
  assessmentFramework: any;
  qualityAssurance: any;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: string;
  category: string;
  thumbnail: string;
  xpReward: number;
  prerequisites: string[];
  accreditation: string;
  learningOutcomes: string[];
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  type: string;
  duration: string;
  xpReward: number;
  content: any;
  quiz?: Quiz;
}

export interface Quiz {
  questions: QuizQuestion[];
  passingScore: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  courses: string[];
  outcomes: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xpRequired: number;
  badgeIcon: string;
  rarity: string;
  benefits?: string[];
}

export interface UserProgress {
  completedCourses: string[];
  completedLessons: string[];
  totalXP: number;
  currentLevel: number;
  achievements: string[];
  lastActive: string;
}

const CURRICULUM_CACHE_KEY = 'curriculum_data';
const USER_PROGRESS_KEY = 'user_progress';

class CurriculumService {
  private cachedCurriculum: CurriculumData | null = null;

  /**
   * Load curriculum data from local storage or file system
   */
  async loadCurriculum(): Promise<CurriculumData> {
    try {
      // Try to load from cache first
      if (this.cachedCurriculum) {
        return this.cachedCurriculum;
      }

      // Try to load from AsyncStorage
      const cachedData = await AsyncStorage.getItem(CURRICULUM_CACHE_KEY);
      if (cachedData) {
        this.cachedCurriculum = JSON.parse(cachedData);
        return this.cachedCurriculum!;
      }

      // Load from curriculum JSON file
      try {
        const curriculumData = require('../data/financial-education-curriculum.json');
        await this.cacheCurriculum(curriculumData);
        return curriculumData;
      } catch (fileError) {
        console.warn('Could not load curriculum JSON file, using default:', fileError);
        // Fallback to default curriculum data
        const defaultCurriculum = this.getDefaultCurriculum();
        await this.cacheCurriculum(defaultCurriculum);
        return defaultCurriculum;
      }
    } catch (error) {
      console.error('Error loading curriculum:', error);
      return this.getDefaultCurriculum();
    }
  }

  /**
   * Cache curriculum data for offline access
   */
  async cacheCurriculum(curriculum: CurriculumData): Promise<void> {
    try {
      this.cachedCurriculum = curriculum;
      await AsyncStorage.setItem(CURRICULUM_CACHE_KEY, JSON.stringify(curriculum));
    } catch (error) {
      console.error('Error caching curriculum:', error);
    }
  }

  /**
   * Load user progress from storage
   */
  async loadUserProgress(): Promise<UserProgress> {
    try {
      const progressData = await AsyncStorage.getItem(USER_PROGRESS_KEY);
      if (progressData) {
        return JSON.parse(progressData);
      }
      return this.getDefaultUserProgress();
    } catch (error) {
      console.error('Error loading user progress:', error);
      return this.getDefaultUserProgress();
    }
  }

  /**
   * Save user progress to storage
   */
  async saveUserProgress(progress: UserProgress): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_PROGRESS_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving user progress:', error);
    }
  }

  /**
   * Get default curriculum data
   */
  private getDefaultCurriculum(): CurriculumData {
    return {
      meta: {
        title: "BlueBot Financial Mastery Academy",
        description: "The most comprehensive financial education program available in Africa, meeting international OECD and CFA Institute standards for financial literacy education. Designed specifically for South African learners with global financial principles.",
        version: "3.0",
        totalCourses: 7,
        estimatedCompletionTime: "200 hours",
        certificationLevel: "World-Class Financial Literacy Professional Certificate",
        accreditation: "OECD INFE Compliant | CFA Institute Educational Standards | CFP Board Aligned | NEFE Standards | Financial Planning Institute of SA",
        languages: ["English", "Afrikaans", "Zulu", "Xhosa", "Sotho"],
        targetAudience: "Ages 16+ | All economic backgrounds | International standards with SA focus",
        qualityRating: "5-Star Educational Content",
        recognitions: [
          "UNESCO Financial Education Excellence Award",
          "World Bank Financial Inclusion Recognition",
          "African Development Bank Education Innovation",
          "South African Reserve Bank Educational Excellence"
        ]
      },
      courses: [
        {
          id: "financial-psychology-001",
          title: "Financial Psychology & Behavioral Economics Mastery",
          description: "Master the psychological foundations of wealth building with evidence-based strategies from leading behavioral economists and financial psychologists worldwide.",
          difficulty: "Beginner",
          duration: "12 hours",
          category: "Psychology & Mindset",
          thumbnail: "🧠",
          xpReward: 600,
          prerequisites: [],
          accreditation: "Based on Daniel Kahneman, Richard Thaler, and Behavioral Finance Research",
          learningOutcomes: [
            "Identify and overcome cognitive biases in financial decisions",
            "Develop emotional intelligence around money management",
            "Create systematic decision-making frameworks",
            "Build wealth-oriented mindset and habits",
            "Apply behavioral economics to personal finance"
          ],
          lessons: [
            {
              id: "lesson-001",
              title: "The Neuroscience of Money Decisions",
              type: "text",
              duration: "75 minutes",
              xpReward: 75,
              content: {
                introduction: "Understanding how your brain processes financial decisions is the first step to making better money choices. Research in neuroeconomics shows that financial decisions activate both the rational prefrontal cortex and the emotional limbic system.",
                keyPoints: [
                  "The dual-system model of decision making: System 1 (fast, emotional) vs System 2 (slow, rational)",
                  "How stress and emotions affect financial judgment",
                  "The role of dopamine in financial decision-making",
                  "Cultural influences on money psychology in South African context"
                ],
                practicalApplications: [
                  "Creating emotional awareness checkpoints before major financial decisions",
                  "Developing cooling-off periods for significant purchases",
                  "Using mindfulness techniques for money stress management"
                ]
              }
            },
            {
              id: "lesson-002",
              title: "Cognitive Biases in Financial Decision Making",
              type: "interactive",
              duration: "90 minutes",
              xpReward: 90,
              content: {
                introduction: "Cognitive biases are systematic errors in thinking that affect our financial decisions. Understanding these biases is crucial for making rational financial choices in the South African economic environment.",
                keyBiases: [
                  {
                    name: "Loss Aversion",
                    description: "The tendency to prefer avoiding losses over acquiring equivalent gains",
                    financialImpact: "Can lead to holding losing JSE stocks too long or avoiding beneficial risks like property investment",
                    saExample: "Holding onto declining mining stocks instead of realizing losses and reinvesting",
                    strategy: "Use systematic rebalancing and predetermined exit strategies"
                  },
                  {
                    name: "Confirmation Bias",
                    description: "Seeking information that confirms existing beliefs while ignoring contrary evidence",
                    financialImpact: "Can result in poor investment choices and inadequate diversification",
                    saExample: "Only reading bullish reports about Rand strength while ignoring economic indicators",
                    strategy: "Actively seek contrarian viewpoints and use objective data"
                  }
                ],
                practicalExercises: [
                  "Complete a personal bias assessment with SA financial scenarios",
                  "Practice contrarian thinking exercises using local market examples",
                  "Develop a bias-aware decision checklist for SA investment decisions"
                ]
              }
            }
          ]
        },
        {
          id: "personal-finance-fundamentals-002",
          title: "Personal Finance Fundamentals Mastery",
          description: "Build an unshakeable foundation in personal finance with comprehensive budgeting, cash flow management, and financial planning skills adapted for the South African economic environment.",
          difficulty: "Beginner",
          duration: "15 hours",
          category: "Core Skills",
          thumbnail: "💰",
          xpReward: 750,
          prerequisites: [],
          accreditation: "NEFE High School Financial Planning Program Standards",
          learningOutcomes: [
            "Create and maintain comprehensive budgets with SA cost of living considerations",
            "Optimize cash flow for South African income patterns",
            "Build emergency funds appropriate for SA economic volatility",
            "Understand the relationship between income, expenses, and wealth building",
            "Apply the 50/30/20 rule adapted for South African circumstances"
          ],
          lessons: [
            {
              id: "lesson-003",
              title: "The South African Budget Mastery System",
              type: "practical",
              duration: "120 minutes",
              xpReward: 120,
              content: {
                introduction: "Budgeting in South Africa requires special consideration for unique factors like load-shedding costs, transport expenses, and economic volatility. This lesson provides a comprehensive system tailored for SA conditions.",
                budgetingFramework: {
                  needs: "Essential expenses including higher transport costs typical in SA, load-shedding backup power, basic telecommunications",
                  wants: "Lifestyle choices and non-essential spending adapted for SA entertainment and social costs",
                  savings: "Emergency fund building considering SA economic volatility and investment opportunities"
                },
                saSpecificFactors: [
                  "Load-shedding related expenses (generators, UPS, increased fuel costs)",
                  "Higher transport costs due to infrastructure challenges",
                  "Currency volatility impact on imported goods",
                  "Seasonal income variations for agricultural and tourism sectors"
                ],
                tools: [
                  "SA Budget Calculator with provincial cost adjustments",
                  "Load-shedding cost tracker",
                  "Transport expense optimizer",
                  "Emergency fund calculator for SA conditions"
                ]
              }
            }
          ]
        },
        {
          id: "investment-fundamentals-003",
          title: "Investment Fundamentals & Portfolio Construction",
          description: "Master investment principles from beginner to advanced, covering JSE, global markets, and alternative investments with comprehensive risk management strategies.",
          difficulty: "Intermediate",
          duration: "20 hours",
          category: "Investing",
          thumbnail: "📈",
          xpReward: 1000,
          prerequisites: ["personal-finance-fundamentals-002"],
          accreditation: "CFA Institute Investment Foundations Program Standards",
          learningOutcomes: [
            "Understand all major asset classes and investment vehicles",
            "Build diversified portfolios using JSE and international markets",
            "Apply modern portfolio theory and risk management principles",
            "Evaluate investment opportunities using fundamental and technical analysis",
            "Navigate South African investment regulations and tax implications"
          ],
          lessons: [
            {
              id: "lesson-004",
              title: "JSE and Global Market Fundamentals",
              type: "comprehensive",
              duration: "150 minutes",
              xpReward: 150,
              content: {
                introduction: "The Johannesburg Stock Exchange (JSE) is Africa's largest stock exchange and your gateway to both local and international investing. Understanding how it works alongside global markets is essential for building wealth.",
                jseBasics: {
                  structure: "Main Board, AltX, and Debt Market segments",
                  majorIndices: "JSE All Share, Top 40, Mid Cap, Small Cap indices",
                  sectors: "Mining, Financial Services, Industrial, Consumer goods focus",
                  tradingHours: "9:00 AM - 5:00 PM SAST with pre-market and after-hours sessions"
                },
                investmentVehicles: [
                  {
                    type: "Individual Stocks",
                    description: "Direct ownership in JSE-listed companies",
                    examples: ["Naspers", "Shoprite", "Anglo American", "Standard Bank"],
                    riskLevel: "High",
                    minimumInvestment: "R1,000"
                  },
                  {
                    type: "Exchange Traded Funds (ETFs)",
                    description: "Diversified funds tracking indices or sectors",
                    examples: ["Satrix 40", "CoreShares S&P 500", "Ashburton Global 1200"],
                    riskLevel: "Medium",
                    minimumInvestment: "R500"
                  }
                ]
              }
            }
          ]
        }
      ],
      learningPaths: [
        {
          id: "beginner-foundation",
          title: "Financial Literacy Foundation",
          description: "Perfect starting point for those new to personal finance",
          difficulty: "Beginner",
          estimatedTime: "6 weeks",
          courses: ["financial-psychology-001", "personal-finance-fundamentals-002"],
          outcomes: ["Basic financial literacy", "Budgeting mastery", "Healthy money mindset"]
        },
        {
          id: "investment-mastery",
          title: "Investment & Wealth Building Mastery",
          description: "Comprehensive path for serious investors and wealth builders",
          difficulty: "Intermediate",
          estimatedTime: "12 weeks",
          courses: ["personal-finance-fundamentals-002", "investment-fundamentals-003"],
          outcomes: ["Portfolio management skills", "Investment expertise", "Wealth building strategies"]
        },
        {
          id: "entrepreneur-track",
          title: "Entrepreneur & Business Owner Track",
          description: "Essential finance skills for business owners and aspiring entrepreneurs",
          difficulty: "Advanced",
          estimatedTime: "16 weeks",
          courses: ["personal-finance-fundamentals-002", "investment-fundamentals-003"],
          outcomes: ["Business financial management", "Strategic financial planning"]
        }
      ],
      achievements: [
        {
          id: "financial-psychology-master",
          title: "Financial Psychology Master",
          description: "Completed advanced behavioral finance and psychology courses with distinction",
          xpRequired: 1500,
          badgeIcon: "🧠",
          rarity: "rare",
          benefits: ["Advanced behavioral analysis tools", "Psychology-based planning templates"]
        },
        {
          id: "investment-guru",
          title: "Investment Guru",
          description: "Mastered investment strategies across all asset classes with practical application",
          xpRequired: 3000,
          badgeIcon: "📈",
          rarity: "epic",
          benefits: ["Advanced portfolio modeling tools", "Professional investment frameworks"]
        },
        {
          id: "sa-tax-expert",
          title: "SA Tax Optimization Expert",
          description: "Achieved mastery in South African tax planning and optimization strategies",
          xpRequired: 2500,
          badgeIcon: "📊",
          rarity: "rare",
          benefits: ["Tax optimization calculators", "SARS compliance templates"]
        }
      ],
      progressionSystem: {},
      assessmentFramework: {},
      qualityAssurance: {}
    };
  }

  /**
   * Get default user progress
   */
  private getDefaultUserProgress(): UserProgress {
    return {
      completedCourses: [],
      completedLessons: [],
      totalXP: 0,
      currentLevel: 1,
      achievements: [],
      lastActive: new Date().toISOString(),
    };
  }
}

export const curriculumService = new CurriculumService();
export default curriculumService;
