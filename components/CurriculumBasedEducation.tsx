/**
 * Curriculum-Based Financial Education Component
 * Fully functional professional learning platform with comprehensive features
 */

import React from 'react';
const { useState, useEffect, useCallback } = React;
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { curriculumService, CurriculumData, Course, Lesson, LearningPath, UserProgress } from '../services/curriculumService';
import { useGamification } from '../contexts/GamificationContext';
import { Linking } from 'react-native';
import GlassCard from './GlassCard';
import { useAWS } from '@/contexts/AWSContext';

interface Quiz {
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number;
  attempts?: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
}

interface QuizState {
  currentQuestionIndex: number;
  selectedAnswers: number[];
  showResult: boolean;
  score: number;
  passed: boolean;
  timeRemaining: number;
  startTime: Date;
  totalTime: number;
  attemptsUsed: number;
}

interface SkillProgress {
  budgeting: number;
  investing: number;
  taxPlanning: number;
  riskManagement: number;
  businessFinance: number;
  creditManagement: number;
  retirementPlanning: number;
  insurancePlanning: number;
}

interface StudySession {
  id: string;
  courseId: string;
  lessonId: string;
  startTime: Date;
  endTime?: Date;
  completed: boolean;
  score?: number;
}

interface LearningGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  coursesRequired: string[];
  progress: number;
  priority: 'low' | 'medium' | 'high';
}

import { theme } from '@/config/theme';

const DIFFICULTY_COLORS = {
  'Beginner': theme.colors.success,
  'Intermediate': theme.colors.warning,
  'Advanced': theme.colors.danger,
};

const CATEGORY_COLORS = {
  'Psychology & Mindset': theme.colors.accent,
  'Core Skills': theme.colors.success,
  'Investing': theme.colors.warning,
  'Tax Planning': theme.colors.accent,
  'Retirement': theme.colors.primary,
  'Business': theme.colors.primaryDark,
  'Technology': theme.colors.accent,
  'Banking': theme.colors.accent,
};

export default function CurriculumBasedEducation() {
  // UI constants for compact navigation tabs
  const TAB_ICON_SIZE = 16;
  const [selectedView, setSelectedView] = useState<'overview' | 'courses' | 'specializations' | 'certifications' | 'lessons' | 'paths' | 'achievements' | 'progress' | 'goals'>('overview');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState<any>(null);
  const [selectedCertification, setSelectedCertification] = useState<any>(null);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [userLevel, setUserLevel] = useState<any>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showPathModal, setShowPathModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showStudyPlanModal, setShowStudyPlanModal] = useState(false);
  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<UserProgress>({
    completedCourses: [],
    completedLessons: [],
    courseProgress: {},
    totalXP: 0,
    currentLevel: 1,
    achievements: [],
    lastActive: new Date().toISOString(),
    studyStreak: 0,
    totalStudyTime: 0,
  });
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    selectedAnswers: [],
    showResult: false,
    score: 0,
    passed: false,
    timeRemaining: 0,
    startTime: new Date(),
    totalTime: 0,
    attemptsUsed: 0,
  });
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [studyStreak, setStudyStreak] = useState(0);
  const [skillProgress, setSkillProgress] = useState<SkillProgress>({
    budgeting: 0,
    investing: 0,
    taxPlanning: 0,
    riskManagement: 0,
    businessFinance: 0,
    creditManagement: 0,
    retirementPlanning: 0,
    insurancePlanning: 0,
  });
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [learningGoals, setLearningGoals] = useState<LearningGoal[]>([]);
  const [weeklyTarget, setWeeklyTarget] = useState(5); // hours per week
  const [dailyStreak, setDailyStreak] = useState(0);
  const [showInteractiveTools, setShowInteractiveTools] = useState(false);
  const [calculatorValues, setCalculatorValues] = useState({
    income: '',
    expenses: '',
    principal: '',
    rate: '',
    time: '',
    monthlyContribution: ''
  });
  // Lesson reading gating states
  const MIN_READING_TIME_BEFORE_QUIZ = 20; // seconds required before quiz unlock
  const [readingStartTime, setReadingStartTime] = useState<number | null>(null);
  const [readingElapsed, setReadingElapsed] = useState(0);
  
  // Interactive Learning States
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [calculatorType, setCalculatorType] = useState<'budget' | 'compound_interest' | null>(null);
  const [scenarioMode, setScenarioMode] = useState<string | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const { addPoints, unlockAchievement, updateStats } = useGamification();
  // AWS Context with fallback to demo mode
  const aws = useAWS();
  const { 
    userProgress: awsUserProgress,
    isInitialized,
    currentUser 
  } = aws || {};
  
  // Demo mode functions
  const saveUserData = async (data: any) => {
    if (isInitialized) {
      // Would save to AWS
      console.log('Saving user data to AWS:', data);
    } else {
      // Demo mode - save to localStorage
      localStorage.setItem('demo-user-progress', JSON.stringify(data));
    }
  };

  const getUserData = () => {
    if (isInitialized && awsUserProgress) {
      return awsUserProgress;
    } else {
      // Demo mode - load from localStorage
      const stored = localStorage.getItem('demo-user-progress');
      return stored ? JSON.parse(stored) : null;
    }
  };

  // Initialize sample learning goals and data
  useEffect(() => {
    const initializeSampleData = () => {
      if (learningGoals.length === 0) {
        const sampleGoals: LearningGoal[] = [
          {
            id: '1',
            title: 'Financial Literacy Mastery',
            description: 'Complete all core financial education courses to build a strong foundation',
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
            coursesRequired: ['financial-psychology-001', 'personal-finance-fundamentals-002'],
            progress: 25,
            priority: 'high'
          },
          {
            id: '2',
            title: 'Investment Knowledge',
            description: 'Learn about different investment options available in South Africa',
            targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
            coursesRequired: ['investing-building-wealth-003'],
            progress: 0,
            priority: 'medium'
          }
        ];
        setLearningGoals(sampleGoals);
      }

      // Initialize skill progress if empty
      if (Object.values(skillProgress).every(val => val === 0)) {
        setSkillProgress({
          budgeting: 15,
          investing: 5,
          taxPlanning: 0,
          riskManagement: 10,
          businessFinance: 0,
          creditManagement: 8,
          retirementPlanning: 3,
          insurancePlanning: 2,
        });
      }

      // Set initial streak and target
      if (dailyStreak === 0) {
        setDailyStreak(3); // Sample streak
      }
    };

    initializeSampleData();
  }, [learningGoals.length, skillProgress, dailyStreak]);

  // Enhanced Learning Functions
  const startStudySession = useCallback((courseId: string, lessonId: string) => {
    const session: StudySession = {
      id: Date.now().toString(),
      courseId,
      lessonId,
      startTime: new Date(),
      completed: false
    };
    setStudySessions(prev => [...prev, session]);
    return session.id;
  }, []);

  const completeStudySession = useCallback((sessionId: string, score?: number) => {
    setStudySessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, endTime: new Date(), completed: true, score }
        : session
    ));
    
    // Update daily streak
    const today = new Date().toDateString();
    const lastSession = studySessions[studySessions.length - 1];
    if (!lastSession || lastSession.startTime.toDateString() !== today) {
      setDailyStreak(prev => prev + 1);
    }
  }, [studySessions]);

  const addLearningGoal = useCallback((goal: Omit<LearningGoal, 'id' | 'progress'>) => {
    const newGoal: LearningGoal = {
      ...goal,
      id: Date.now().toString(),
      progress: 0
    };
    setLearningGoals(prev => [...prev, newGoal]);
  }, []);

  const updateGoalProgress = useCallback((goalId: string) => {
    setLearningGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        const completedCourses = goal.coursesRequired.filter(courseId => 
          userProgress.completedCourses.includes(courseId)
        );
        const progress = (completedCourses.length / goal.coursesRequired.length) * 100;
        return { ...goal, progress };
      }
      return goal;
    }));
  }, [userProgress.completedCourses]);

  // Interactive Calculator Components
  const renderBudgetCalculator = () => (
    <View style={styles.calculatorContainer}>
      <Text style={styles.calculatorTitle}>Budget Calculator</Text>
      <Text style={styles.calculatorDescription}>
        Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Monthly After-Tax Income (R)</Text>
        <TextInput
          style={styles.calculatorInput}
          value={calculatorValues.income}
          onChangeText={(text) => setCalculatorValues(prev => ({...prev, income: text}))}
          placeholder="Enter your monthly income"
          keyboardType="numeric"
        />
      </View>
      
      {calculatorValues.income && (
        <View style={styles.calculatorResults}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Needs (50%):</Text>
            <Text style={styles.resultValue}>R{(parseFloat(calculatorValues.income) * 0.5).toFixed(2)}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Wants (30%):</Text>
            <Text style={styles.resultValue}>R{(parseFloat(calculatorValues.income) * 0.3).toFixed(2)}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Savings (20%):</Text>
            <Text style={styles.resultValue}>R{(parseFloat(calculatorValues.income) * 0.2).toFixed(2)}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderCompoundInterestCalculator = () => {
    const calculateCompoundInterest = () => {
      const principal = parseFloat(calculatorValues.principal) || 0;
      const rate = parseFloat(calculatorValues.rate) / 100 || 0;
      const time = parseFloat(calculatorValues.time) || 0;
      const monthlyContrib = parseFloat(calculatorValues.monthlyContribution) || 0;
      
      const futureValue = principal * Math.pow(1 + rate, time);
      const monthlyRate = rate / 12;
      const months = time * 12;
      const annuityValue = monthlyContrib * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
      
      return futureValue + annuityValue;
    };

    return (
      <View style={styles.calculatorContainer}>
        <Text style={styles.calculatorTitle}>Compound Interest Calculator</Text>
        <Text style={styles.calculatorDescription}>
          See how your money can grow over time with compound interest
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Initial Investment (R)</Text>
          <TextInput
            style={styles.calculatorInput}
            value={calculatorValues.principal}
            onChangeText={(text) => setCalculatorValues(prev => ({...prev, principal: text}))}
            placeholder="Initial amount"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Annual Interest Rate (%)</Text>
          <TextInput
            style={styles.calculatorInput}
            value={calculatorValues.rate}
            onChangeText={(text) => setCalculatorValues(prev => ({...prev, rate: text}))}
            placeholder="Annual interest rate"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Time Period (Years)</Text>
          <TextInput
            style={styles.calculatorInput}
            value={calculatorValues.time}
            onChangeText={(text) => setCalculatorValues(prev => ({...prev, time: text}))}
            placeholder="Number of years"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Monthly Contribution (R)</Text>
          <TextInput
            style={styles.calculatorInput}
            value={calculatorValues.monthlyContribution}
            onChangeText={(text) => setCalculatorValues(prev => ({...prev, monthlyContribution: text}))}
            placeholder="Monthly contribution"
            keyboardType="numeric"
          />
        </View>
        
        {calculatorValues.principal && calculatorValues.rate && calculatorValues.time && (
          <View style={styles.calculatorResults}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Future Value:</Text>
              <Text style={[styles.resultValue, styles.highlightedResult]}>
                R{calculateCompoundInterest().toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  useEffect(() => {
    loadCurriculum();
  }, []);

  // Reading timer effect
  useEffect(() => {
    if (!showLessonModal || readingStartTime === null) return;
    const interval = setInterval(() => {
      setReadingElapsed(Math.floor((Date.now() - readingStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [showLessonModal, readingStartTime]);

  const loadCurriculum = async () => {
    try {
      setLoading(true);
      
      // Load curriculum from service
      const loadedCurriculum = await curriculumService.loadCurriculum();
      const storedProgress = await loadStoredProgress();
      
      setCurriculum(loadedCurriculum);
      setUserProgress(storedProgress);
      
      // Load specializations and certifications
      const specializationsData = await curriculumService.getSpecializations();
      const certificationsData = await curriculumService.getCertifications();
      const gamificationConfig = await curriculumService.getGamificationConfig();
      
      setSpecializations(specializationsData);
      setCertifications(certificationsData);
      
      // Get user level
      if (gamificationConfig) {
        const level = await curriculumService.getUserLevel(storedProgress.totalXP);
        setUserLevel(level);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading curriculum:', error);
      
      // Fallback to created curriculum if loading fails
      const interactiveCurriculum = createInteractiveCurriculum();
      const storedProgress = await loadStoredProgress();
      
      setCurriculum(interactiveCurriculum);
      setUserProgress(storedProgress);
      setLoading(false);
    }
  };

  const createInteractiveCurriculum = (): CurriculumData => {
    return {
      meta: {
        title: "BlueBot Financial Mastery Academy",
        description: "Interactive financial education for South African learners",
        version: "1.0.0",
  totalCourses: 7,
        estimatedCompletionTime: "12-16 weeks",
        certificationLevel: "Financial Literacy Certificate",
        accreditation: "BlueBot Academy",
        languages: ["English"],
        targetAudience: "Young Adults, Professionals, Students",
        qualityRating: "5 Stars",
        recognitions: ["Interactive Learning", "Practical Application"]
      },
  courses: [
        {
          id: "budgeting-basics",
          title: "Smart Budgeting & Money Management",
          description: "Learn to create and maintain a budget that works for your South African lifestyle",
          difficulty: "Beginner",
          duration: "2-3 hours",
          category: "Core Skills",
          thumbnail: "💰",
          xpReward: 150,
          prerequisites: [],
          accreditation: "BlueBot Academy",
          learningOutcomes: [
            "Create a personal budget using the 50/30/20 rule",
            "Track expenses effectively using digital tools",
            "Understand South African tax implications",
            "Set up emergency fund goals"
          ],
          lessons: [
            {
              id: "budget-intro",
              title: "Introduction to Budgeting",
              type: "interactive",
              duration: "30 min",
              xpReward: 50,
              content: {
                introduction: "Budgeting is the foundation of financial success. Let's explore how to create a budget that works for your South African income and expenses.",
                keyPoints: [
                  "Income vs Expenses - understanding the basics",
                  "Fixed vs Variable costs in SA context",
                  "The 50/30/20 budgeting rule explained",
                  "Digital tools for budget tracking"
                ],
                saSpecificFactors: [
                  "Understanding South African salary structures",
                  "Tax implications and deductions",
                  "Common SA living expenses to consider",
                  "Local banking and payment systems"
                ],
                interactiveElements: {
                  calculator: "budget",
                  scenarios: ["student", "working_professional", "family"]
                }
              },
              quiz: {
                questions: [
                  {
                    id: "q1",
                    question: "What percentage of income should go to needs according to the 50/30/20 rule?",
                    options: ["30%", "50%", "20%", "70%"],
                    correctAnswer: 1,
                    explanation: "The 50/30/20 rule allocates 50% for needs, 30% for wants, and 20% for savings and debt repayment."
                  },
                  {
                    id: "q2",
                    question: "Which is considered a 'need' in budgeting?",
                    options: ["Dining out", "Rent/mortgage", "Entertainment", "Gym membership"],
                    correctAnswer: 1,
                    explanation: "Rent or mortgage payments are essential housing costs and considered needs in any budget."
                  }
                ],
                passingScore: 70
              }
            }
          ]
        },
        {
          id: "standard-bank-essentials",
          title: "Banking with Standard Bank: Accounts, Savings, and Credit",
          description: "Understand Standard Bank’s core products and how to choose the right one for your needs in South Africa.",
          difficulty: "Beginner",
          duration: "2-3 hours",
          category: "Banking",
          thumbnail: "🏦",
          xpReward: 180,
          prerequisites: [],
          accreditation: "BlueBot Academy",
          learningOutcomes: [
            "Know the differences between everyday accounts and savings products",
            "Compare fees, features, and eligibility",
            "Understand responsible use of credit (loans, cards)",
            "Find official information and verify current offers"
          ],
          lessons: [
            {
              id: "sb-mymo-plus",
              title: "MyMo Plus Account: Everyday Banking",
              type: "text",
              duration: "20 min",
              xpReward: 30,
              content: {
                introduction: "MyMo Plus is a low‑cost everyday account with bundled benefits suitable for daily use.",
                keyPoints: [
                  "Fixed monthly fee with included transactions",
                  "Card + digital app access",
                  "Suitable for salaries and debit orders"
                ],
                link: "https://www.standardbank.co.za/southafrica/personal/products-and-services/bank-with-us/bank-accounts/mymo-plus",
                disclaimer: "Product availability, pricing, fees, and terms may change. Always verify on Standard Bank’s official website."
              }
            },
            {
              id: "sb-puresave",
              title: "PureSave: Building Your Savings",
              type: "text",
              duration: "20 min",
              xpReward: 30,
              content: {
                introduction: "PureSave helps you separate and grow savings with competitive interest and easy access.",
                keyPoints: [
                  "No monthly fees in typical tiers",
                  "Earn interest on balances",
                  "Great for emergency funds"
                ],
                link: "https://www.standardbank.co.za/southafrica/personal/products-and-services/save-and-invest/savings-accounts/puresave",
                disclaimer: "Rates, tiers, and rules change periodically. Check official pages for the latest details."
              }
            },
            {
              id: "sb-credit-cards",
              title: "Credit Cards: Features and Responsible Use",
              type: "text",
              duration: "20 min",
              xpReward: 30,
              content: {
                introduction: "Standard Bank offers a range of credit cards for different needs. Learn benefits and how to use credit wisely.",
                keyPoints: [
                  "Interest‑free periods when paid in full",
                  "Rewards and travel benefits vary by card",
                  "Build credit responsibly, avoid revolving balances"
                ],
                link: "https://www.standardbank.co.za/southafrica/personal/products-and-services/borrow-for-your-needs/credit-cards",
                disclaimer: "Credit limits, fees, and benefits depend on eligibility and can change. Confirm on the official site."
              }
            },
            {
              id: "sb-personal-loan",
              title: "Personal Loans: When and How",
              type: "text",
              duration: "20 min",
              xpReward: 30,
              content: {
                introduction: "Understand fixed repayments, interest, and when a personal loan might be appropriate.",
                keyPoints: [
                  "Borrow only for planned, necessary expenses",
                  "Compare total cost of credit",
                  "Maintain an emergency buffer to avoid debt runoff"
                ],
                link: "https://www.standardbank.co.za/southafrica/personal/products-and-services/borrow-for-your-needs/personal-loans",
                disclaimer: "Terms, APRs, and fees vary by profile. Always review pre‑agreement disclosures and affordability."
              }
            },
            {
              id: "sb-home-loan",
              title: "Home Loans Basics",
              type: "text",
              duration: "25 min",
              xpReward: 30,
              content: {
                introduction: "Explore deposits, rates (fixed vs variable), and affordability checks for home loans.",
                keyPoints: [
                  "Understand transfer costs and initiation fees",
                  "Rate type selection impacts monthly repayments",
                  "Credit profile and income drive eligibility"
                ],
                link: "https://www.standardbank.co.za/southafrica/personal/products-and-services/borrow-for-your-needs/home-loans",
                disclaimer: "Property finance terms depend on underwriting; consult the bank and compare options."
              }
            },
            {
              id: "sb-vehicle-finance",
              title: "Vehicle & Asset Finance",
              type: "text",
              duration: "20 min",
              xpReward: 30,
              content: {
                introduction: "Understand deposits, balloon payments, and total cost when financing a car.",
                keyPoints: [
                  "Balloons reduce instalments but increase total interest",
                  "Insurance and maintenance add to monthly ownership cost",
                  "Consider term length vs depreciation"
                ],
                link: "https://www.standardbank.co.za/southafrica/personal/products-and-services/borrow-for-your-needs/vehicle-and-asset-finance",
                disclaimer: "Finance structures affect long‑term cost; review all options and conditions."
              }
            },
            {
              id: "sb-forex-travel",
              title: "Forex and Travel Wallet",
              type: "text",
              duration: "15 min",
              xpReward: 30,
              content: {
                introduction: "Manage foreign currency for travel with compliant solutions and better control.",
                keyPoints: [
                  "Understand exchange margins and fees",
                  "Preload major currencies for trips",
                  "Know your annual allowances"
                ],
                link: "https://www.standardbank.co.za/southafrica/personal/products-and-services/insure/foreign-exchange",
                disclaimer: "FX products are subject to regulations and market rates; confirm details before travelling."
              }
            },
            {
              id: "sb-student-loan",
              title: "Student Loans Overview",
              type: "text",
              duration: "15 min",
              xpReward: 30,
              content: {
                introduction: "Finance education costs responsibly with a clear repayment plan.",
                keyPoints: [
                  "Often requires a guarantor/co‑signer",
                  "Interest may accrue during study",
                  "Budget for grace period and start of repayments"
                ],
                link: "https://www.standardbank.co.za/southafrica/personal/products-and-services/borrow-for-your-needs/student-loans",
                disclaimer: "Eligibility and terms vary; verify current requirements and costs."
              }
            },
            {
              id: "sb-business-account",
              title: "Business Current Account Basics",
              type: "text",
              duration: "20 min",
              xpReward: 30,
              content: {
                introduction: "Choose a business account that matches your transaction profile and growth plans.",
                keyPoints: [
                  "Compare bundles vs pay‑as‑you‑transact",
                  "Integrations for invoicing and accounting",
                  "Consider merchant (POS/e‑commerce) needs"
                ],
                link: "https://www.standardbank.co.za/southafrica/business/products-and-services/bank-with-us/business-accounts",
                disclaimer: "Business banking pricing and features differ by account tier; review the official schedule of fees."
              }
            }
          ]
        },
        {
          id: "investing-101",
          title: "Investment Fundamentals for SA",
          description: "Understand investment options available to South Africans",
          difficulty: "Intermediate",
          duration: "3-4 hours",
          category: "Investing",
          thumbnail: "📈",
          xpReward: 200,
          prerequisites: ["budgeting-basics"],
          accreditation: "BlueBot Academy",
          learningOutcomes: [
            "Understand different investment vehicles in SA",
            "Learn about JSE and international markets",
            "Calculate compound interest and returns",
            "Create a basic investment strategy"
          ],
          lessons: [
            {
              id: "investment-basics",
              title: "Investment Fundamentals",
              type: "interactive",
              duration: "45 min",
              xpReward: 75,
              content: {
                introduction: "Investing is crucial for building wealth over time. Learn about the investment landscape in South Africa.",
                keyPoints: [
                  "Risk vs Return relationship",
                  "Compound interest power",
                  "Asset classes: Stocks, Bonds, Property, Cash",
                  "Investment timeline considerations"
                ],
                saSpecificFactors: [
                  "JSE (Johannesburg Stock Exchange) basics",
                  "Tax-free savings accounts (TFSA)",
                  "Retirement annuities (RA) benefits",
                  "Unit trusts and ETFs in SA"
                ],
                interactiveElements: {
                  calculator: "compound_interest",
                  simulator: "investment_growth",
                  scenarios: ["conservative", "moderate", "aggressive"]
                }
              },
              quiz: {
                questions: [
                  {
                    id: "q1",
                    question: "What is the annual TFSA contribution limit in South Africa (2024)?",
                    options: ["R30,000", "R36,000", "R40,000", "R50,000"],
                    correctAnswer: 1,
                    explanation: "The Tax-Free Savings Account annual contribution limit is R36,000 with a lifetime limit of R500,000."
                  },
                  {
                    id: "q2",
                    question: "Which of these is considered a low-risk investment?",
                    options: ["Individual stocks", "Government bonds", "Cryptocurrency", "Forex trading"],
                    correctAnswer: 1,
                    explanation: "Government bonds are considered low-risk investments as they're backed by the government."
                  }
                ],
                passingScore: 70
              }
            },
            {
              id: "compound-interest",
              title: "The Power of Compound Interest",
              type: "interactive",
              duration: "30 min",
              xpReward: 60,
              content: {
                introduction: "Understand how compound interest can work for you to build wealth over time.",
                keyPoints: [
                  "Simple vs Compound interest explained",
                  "Time horizon impact on returns",
                  "Regular contributions effect",
                  "Real-world examples and calculations"
                ],
                saSpecificFactors: [
                  "South African inflation rates consideration",
                  "Tax implications on investment returns",
                  "Local investment account options",
                  "Currency impact on international investments"
                ],
                interactiveElements: {
                  calculator: "compound_calculator",
                  scenarios: ["early_starter", "late_starter", "regular_saver"]
                }
              },
              quiz: {
                questions: [
                  {
                    id: "q1",
                    question: "If you invest R1000 at 10% annual interest compounded annually, how much will you have after 2 years?",
                    options: ["R1200", "R1210", "R1100", "R1300"],
                    correctAnswer: 1,
                    explanation: "Year 1: R1000 × 1.10 = R1100. Year 2: R1100 × 1.10 = R1210. This demonstrates compound interest."
                  }
                ],
                passingScore: 70
              }
            }
          ]
        },
        {
          id: "debt-management",
          title: "Debt Management & Credit Health",
          description: "Learn how to manage debt effectively and build good credit",
          difficulty: "Intermediate",
          duration: "2-3 hours",
          category: "Core Skills",
          thumbnail: "💳",
          xpReward: 180,
          prerequisites: ["budgeting-basics"],
          accreditation: "BlueBot Academy",
          learningOutcomes: [
            "Understand different types of debt",
            "Learn debt repayment strategies",
            "Build and maintain good credit score",
            "Avoid debt traps and predatory lending"
          ],
          lessons: [
            {
              id: "debt-types",
              title: "Understanding Different Types of Debt",
              type: "interactive",
              duration: "40 min",
              xpReward: 70,
              content: {
                introduction: "Not all debt is created equal. Learn to distinguish between good and bad debt and manage them effectively.",
                keyPoints: [
                  "Good debt vs Bad debt",
                  "Interest rates and payment terms",
                  "Debt-to-income ratios",
                  "Debt consolidation options"
                ],
                saSpecificFactors: [
                  "South African credit bureau system",
                  "National Credit Act protections",
                  "Common SA debt products (store cards, personal loans)",
                  "Debt counselling services available"
                ],
                interactiveElements: {
                  calculator: "debt_payoff",
                  scenarios: ["credit_card_debt", "student_loan", "home_loan"]
                }
              },
              quiz: {
                questions: [
                  {
                    id: "q1",
                    question: "Which is generally considered 'good debt'?",
                    options: ["Credit card debt", "Home mortgage", "Store card debt", "Payday loan"],
                    correctAnswer: 1,
                    explanation: "A home mortgage is considered good debt because it helps you build equity in an appreciating asset."
                  },
                  {
                    id: "q2",
                    question: "What is a healthy debt-to-income ratio?",
                    options: ["Below 20%", "Below 36%", "Below 50%", "Below 60%"],
                    correctAnswer: 1,
                    explanation: "Financial experts recommend keeping your total debt-to-income ratio below 36% for optimal financial health."
                  }
                ],
                passingScore: 70
              }
            }
          ]
        },
        {
          id: "retirement-planning",
          title: "Retirement Planning for South Africans",
          description: "Plan for a comfortable retirement using SA-specific retirement vehicles",
          difficulty: "Advanced",
          duration: "4-5 hours",
          category: "Retirement",
          thumbnail: "🏖️",
          xpReward: 250,
          prerequisites: ["budgeting-basics", "investing-101"],
          accreditation: "BlueBot Academy",
          learningOutcomes: [
            "Understand SA retirement fund system",
            "Calculate retirement needs",
            "Optimize retirement contributions",
            "Plan for retirement income strategies"
          ],
          lessons: [
            {
              id: "retirement-basics",
              title: "Retirement Planning Basics",
              type: "interactive",
              duration: "50 min",
              xpReward: 85,
              content: {
                introduction: "Start planning for retirement early to leverage the power of compound growth and ensure financial security.",
                keyPoints: [
                  "Retirement planning timeline",
                  "Calculating retirement needs",
                  "Inflation impact on retirement",
                  "Healthcare costs in retirement"
                ],
                saSpecificFactors: [
                  "Government Employee Pension Fund (GEPF)",
                  "Retirement annuity tax benefits",
                  "Preservation funds options",
                  "Living annuity vs life annuity choices"
                ],
                interactiveElements: {
                  calculator: "retirement_needs",
                  scenarios: ["early_retirement", "normal_retirement", "delayed_retirement"]
                }
              },
              quiz: {
                questions: [
                  {
                    id: "q1",
                    question: "What percentage of pre-retirement income do financial planners recommend for retirement?",
                    options: ["50-60%", "70-80%", "90-100%", "40-50%"],
                    correctAnswer: 1,
                    explanation: "Most financial planners recommend replacing 70-80% of pre-retirement income to maintain your lifestyle."
                  }
                ],
                passingScore: 70
              }
            }
          ]
        },
        {
          id: "tax-planning",
          title: "South African Tax Planning",
          description: "Understand SA tax system and optimize your tax obligations",
          difficulty: "Advanced",
          duration: "3-4 hours",
          category: "Tax Planning",
          thumbnail: "📊",
          xpReward: 220,
          prerequisites: ["budgeting-basics"],
          accreditation: "BlueBot Academy",
          learningOutcomes: [
            "Understand SA personal income tax",
            "Learn about tax deductions and rebates",
            "Plan for capital gains tax",
            "Optimize tax-efficient investments"
          ],
          lessons: [
            {
              id: "income-tax-basics",
              title: "Personal Income Tax in SA",
              type: "interactive",
              duration: "45 min",
              xpReward: 80,
              content: {
                introduction: "Navigate the South African tax system effectively and ensure you're paying the right amount of tax.",
                keyPoints: [
                  "Progressive tax system explained",
                  "Tax brackets and rates",
                  "PAYE vs provisional tax",
                  "Tax return filing requirements"
                ],
                saSpecificFactors: [
                  "SARS eFiling system",
                  "Medical aid tax credits",
                  "Retirement annuity tax deductions",
                  "Tax-free savings account benefits"
                ],
                interactiveElements: {
                  calculator: "tax_calculator",
                  scenarios: ["employee", "freelancer", "business_owner"]
                }
              },
              quiz: {
                questions: [
                  {
                    id: "q1",
                    question: "What is the highest marginal tax rate in South Africa (2024)?",
                    options: ["39%", "41%", "45%", "47%"],
                    correctAnswer: 2,
                    explanation: "The highest marginal tax rate in South Africa is 45% for income above R1,817,850."
                  }
                ],
                passingScore: 70
              }
            }
          ]
        },
        {
          id: "emergency-fund",
          title: "Building Your Emergency Fund",
          description: "Create a financial safety net for unexpected expenses",
          difficulty: "Beginner",
          duration: "1-2 hours",
          category: "Core Skills",
          thumbnail: "🛡️",
          xpReward: 120,
          prerequisites: [],
          accreditation: "BlueBot Academy",
          learningOutcomes: [
            "Determine emergency fund size needed",
            "Choose the right savings vehicle",
            "Build emergency fund systematically",
            "Know when to use emergency funds"
          ],
          lessons: [
            {
              id: "emergency-fund-basics",
              title: "Emergency Fund Essentials",
              type: "interactive",
              duration: "35 min",
              xpReward: 65,
              content: {
                introduction: "An emergency fund is your financial safety net. Learn how to build and maintain one effectively.",
                keyPoints: [
                  "3-6 months expenses rule",
                  "Emergency vs opportunity funds",
                  "Liquid vs illiquid savings",
                  "Automated savings strategies"
                ],
                saSpecificFactors: [
                  "High-yield savings accounts in SA",
                  "Money market accounts options",
                  "32-day notice accounts benefits",
                  "Bank failures and deposit insurance"
                ],
                interactiveElements: {
                  calculator: "emergency_fund_target",
                  scenarios: ["single_income", "dual_income", "freelancer"]
                }
              },
              quiz: {
                questions: [
                  {
                    id: "q1",
                    question: "How many months of expenses should an emergency fund typically cover?",
                    options: ["1-2 months", "3-6 months", "6-12 months", "12+ months"],
                    correctAnswer: 1,
                    explanation: "Most financial experts recommend having 3-6 months of living expenses saved for emergencies."
                  }
                ],
                passingScore: 70
              }
            }
          ]
        }
      ],
  learningPaths: [
        {
          id: "beginner-path",
          title: "Financial Literacy Foundation",
          description: "Start your financial journey with essential skills",
          difficulty: "Beginner",
          estimatedTime: "4-6 weeks",
          courses: ["budgeting-basics", "emergency-fund"],
          outcomes: ["Budget creation", "Emergency fund setup", "Basic financial planning"]
        },
        {
          id: "standard-bank-basics",
          title: "Standard Bank Essentials",
          description: "Learn the basics of everyday banking with Standard Bank",
          difficulty: "Beginner",
          estimatedTime: "1-2 weeks",
          courses: ["standard-bank-essentials"],
          outcomes: ["Choose the right account", "Build savings", "Use credit responsibly"]
        },
        {
          id: "investment-path",
          title: "Investment Mastery Track",
          description: "Build wealth through smart investing strategies",
          difficulty: "Intermediate",
          estimatedTime: "6-8 weeks",
          courses: ["budgeting-basics", "investing-101", "retirement-planning"],
          outcomes: ["Investment strategy", "Portfolio management", "Retirement planning"]
        },
        {
          id: "debt-freedom-path",
          title: "Debt Freedom Journey",
          description: "Master debt management and achieve financial freedom",
          difficulty: "Intermediate",
          estimatedTime: "4-6 weeks",
          courses: ["budgeting-basics", "debt-management", "emergency-fund"],
          outcomes: ["Debt elimination", "Credit score improvement", "Financial resilience"]
        },
        {
          id: "tax-optimization-path",
          title: "Tax Optimization Expert",
          description: "Master South African tax system for maximum savings",
          difficulty: "Advanced",
          estimatedTime: "3-4 weeks",
          courses: ["budgeting-basics", "investing-101", "tax-planning"],
          outcomes: ["Tax efficiency", "Legal tax minimization", "Investment optimization"]
        },
        {
          id: "comprehensive-path",
          title: "Complete Financial Mastery",
          description: "Comprehensive financial education covering all aspects",
          difficulty: "Advanced",
          estimatedTime: "12-16 weeks",
          courses: ["budgeting-basics", "emergency-fund", "investing-101", "debt-management", "retirement-planning", "tax-planning"],
          outcomes: ["Complete financial literacy", "Wealth building", "Financial independence planning"]
        }
      ],
      achievements: [
        {
          id: "first-lesson",
          title: "Learning Begins",
          description: "Complete your first lesson",
          xpRequired: 50,
          badgeIcon: "🎯",
          rarity: "Common"
        },
        {
          id: "budget-master",
          title: "Budget Master",
          description: "Complete the budgeting course",
          xpRequired: 150,
          badgeIcon: "💰",
          rarity: "Uncommon"
        },
        {
          id: "investment-guru",
          title: "Investment Guru",
          description: "Complete the investment fundamentals course",
          xpRequired: 200,
          badgeIcon: "📈",
          rarity: "Uncommon"
        },
        {
          id: "debt-crusher",
          title: "Debt Crusher",
          description: "Complete the debt management course",
          xpRequired: 180,
          badgeIcon: "💳",
          rarity: "Uncommon"
        },
        {
          id: "emergency-ready",
          title: "Emergency Ready",
          description: "Complete the emergency fund course",
          xpRequired: 120,
          badgeIcon: "🛡️",
          rarity: "Common"
        },
        {
          id: "retirement-planner",
          title: "Retirement Planner",
          description: "Complete the retirement planning course",
          xpRequired: 250,
          badgeIcon: "🏖️",
          rarity: "Rare"
        },
        {
          id: "tax-optimizer",
          title: "Tax Optimizer",
          description: "Complete the tax planning course",
          xpRequired: 220,
          badgeIcon: "📊",
          rarity: "Rare"
        },
        {
          id: "quiz-perfectionist",
          title: "Quiz Perfectionist",
          description: "Score 100% on 5 quizzes",
          xpRequired: 500,
          badgeIcon: "🎯",
          rarity: "Epic"
        },
        {
          id: "learning-streak-7",
          title: "Week Warrior",
          description: "Complete lessons for 7 consecutive days",
          xpRequired: 350,
          badgeIcon: "⚡",
          rarity: "Rare"
        },
        {
          id: "learning-streak-30",
          title: "Month Master",
          description: "Complete lessons for 30 consecutive days",
          xpRequired: 1500,
          badgeIcon: "🔥",
          rarity: "Legendary"
        },
        {
          id: "course-completionist",
          title: "Course Completionist",
          description: "Complete all available courses",
          xpRequired: 1000,
          badgeIcon: "👑",
          rarity: "Legendary"
        },
        {
          id: "financial-expert",
          title: "Financial Expert",
          description: "Reach level 10",
          xpRequired: 2000,
          badgeIcon: "🎓",
          rarity: "Legendary"
        }
      ],
      progressionSystem: {},
      assessmentFramework: {},
      qualityAssurance: {}
    };
  };

  const loadStoredProgress = async (): Promise<UserProgress> => {
    try {
      const stored = await curriculumService.loadUserProgress();
      return stored;
    } catch {
      return {
        completedCourses: [],
        completedLessons: [],
        courseProgress: {},
        totalXP: 0,
        currentLevel: 1,
        achievements: [],
        lastActive: new Date().toISOString(),
        studyStreak: 0,
        totalStudyTime: 0,
      };
    }
  };

  const openCourse = (course: Course) => {
    setSelectedCourse(course);
    setShowCourseModal(true);
  };

  const openLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setShowLessonModal(true);
  setReadingStartTime(Date.now());
  setReadingElapsed(0);
  };

  const openPath = (path: LearningPath) => {
    setSelectedPath(path);
    setShowPathModal(true);
  };

  const completeLesson = async (lessonId: string, xpReward: number) => {
    try {
      if (userProgress.completedLessons.includes(lessonId)) {
        Alert.alert('Already Completed', 'You have already completed this lesson!');
        return;
      }

      const newLevel = calculateLevel(userProgress.totalXP + xpReward);
      const leveledUp = newLevel > userProgress.currentLevel;
      
      const newProgress = {
        ...userProgress,
        completedLessons: [...userProgress.completedLessons, lessonId],
        totalXP: userProgress.totalXP + xpReward,
        currentLevel: newLevel,
        lastActive: new Date().toISOString()
      };
      
      setUserProgress(newProgress);
      await curriculumService.saveUserProgress(newProgress);
      
      // Update gamification system
      try {
        await addPoints(xpReward);
        await updateStats({ lessonsCompleted: userProgress.completedLessons.length + 1 });
      } catch (gamificationError) {
        console.warn('Gamification update failed:', gamificationError);
        // Continue with lesson completion even if gamification fails
      }
      
      // Update study streak
      updateStudyStreak();
      
      // Update skill progress
      updateSkillProgress(lessonId);
      
      // Check for achievements
      try {
        if (newProgress.completedLessons.length === 1) {
          await unlockAchievement('first-lesson');
        }
        if (newProgress.completedLessons.length === 10) {
          await unlockAchievement('lesson-enthusiast');
        }
        if (newProgress.completedLessons.length === 50) {
          await unlockAchievement('learning-master');
        }
        
        // Check if course is completed
        const courseCompleted = checkCourseCompletion(lessonId, newProgress);
        if (courseCompleted) {
          await unlockAchievement('course-completed');
        }
      } catch (achievementError) {
        console.warn('Achievement update failed:', achievementError);
        // Continue with lesson completion even if achievement fails
      }
      
      let message = `You earned ${xpReward} XP! 🎉`;
      if (leveledUp) {
        message += `\n\nLevel Up! 🚀 You're now level ${newLevel}!`;
      }
      
      Alert.alert('Lesson Completed!', message);
      setShowLessonModal(false);
    } catch (error) {
      console.error('Error completing lesson:', error);
      Alert.alert('Error', 'Failed to complete lesson. Please try again.');
    }
  };

  const startQuiz = (lesson: Lesson) => {
    if (!lesson.quiz) {
      Alert.alert('No Quiz Available', 'This lesson does not have a quiz.');
      return;
    }
    // Prevent starting quiz if reading time insufficient
    if (readingElapsed < MIN_READING_TIME_BEFORE_QUIZ) {
      Alert.alert('Keep Learning', `Please review the lesson content for at least ${MIN_READING_TIME_BEFORE_QUIZ} seconds before attempting the quiz.`);
      return;
    }

    const timeLimit = lesson.quiz.questions.length * 120; // 2 minutes per question
    const maxAttempts = 3; // Allow up to 3 attempts

    setSelectedQuiz(lesson.quiz);
    setQuizState({
      currentQuestionIndex: 0,
      selectedAnswers: new Array(lesson.quiz.questions.length).fill(-1),
      showResult: false,
      score: 0,
      passed: false,
      timeRemaining: timeLimit,
      startTime: new Date(),
      totalTime: timeLimit,
      attemptsUsed: 0,
    });
    setShowQuizModal(true);

    // Start the quiz timer
    const timer = setInterval(() => {
      setQuizState(prev => {
        if (prev.timeRemaining <= 1) {
          clearInterval(timer);
          // Auto-submit when time runs out
          setTimeout(() => finishQuiz(), 100);
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    // Store timer reference for cleanup
    (global as any).quizTimer = timer;
  };

  const selectAnswer = (answerIndex: number) => {
    const newAnswers = [...quizState.selectedAnswers];
    newAnswers[quizState.currentQuestionIndex] = answerIndex;
    setQuizState(prev => ({
      ...prev,
      selectedAnswers: newAnswers
    }));
  };

  const nextQuestion = () => {
    if (quizState.currentQuestionIndex < (selectedQuiz?.questions.length || 0) - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }));
    } else {
      finishQuiz();
    }
  };

  const previousQuestion = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1
      }));
    }
  };

  const finishQuiz = async () => {
    if (!selectedQuiz) return;

    // Clear the timer
    if ((global as any).quizTimer) {
      clearInterval((global as any).quizTimer);
      (global as any).quizTimer = null;
    }

    let correctAnswers = 0;
    selectedQuiz.questions.forEach((question, index) => {
      if (quizState.selectedAnswers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / selectedQuiz.questions.length) * 100);
    const passed = score >= selectedQuiz.passingScore;
    const timeTaken = quizState.totalTime - quizState.timeRemaining;

    setQuizState(prev => ({
      ...prev,
      score,
      passed,
      showResult: true,
      attemptsUsed: prev.attemptsUsed + 1
    }));

    if (passed) {
      // Award bonus XP for quiz completion
      let bonusXP = Math.round(score * 1.5); // 1.5 XP per percentage point
      
      // Time bonus: extra XP for completing quickly
      const timeBonus = quizState.timeRemaining > quizState.totalTime * 0.5 ? 50 : 0;
      bonusXP += timeBonus;
      
      // Perfect score bonus
      if (score === 100) {
        bonusXP += 100;
      }
      
      await addPoints(bonusXP);
      
      // Check for quiz-specific achievements
      checkQuizAchievements(score, correctAnswers, selectedQuiz.questions.length);
      
      // Update skill progress
      if (selectedLesson) {
        updateSkillProgress(selectedLesson.id);
      }

      // Auto-complete the lesson upon passing quiz (removes need for manual complete button)
      if (selectedLesson?.id) {
        completeLesson(selectedLesson.id, selectedLesson.xpReward || 0);
      }
    }
  };

  const updateStudyStreak = () => {
    const today = new Date().toDateString();
    const lastStudyDate = userProgress.lastActive ? new Date(userProgress.lastActive).toDateString() : '';
    
    if (today !== lastStudyDate) {
      const newStreak = studyStreak + 1;
      setStudyStreak(newStreak);
      
      // Check streak achievements
      if (newStreak === 7) {
        unlockAchievement('week-warrior');
      } else if (newStreak === 30) {
        unlockAchievement('month-master');
      }
    }
  };

  const updateSkillProgress = (lessonId: string) => {
    // Update skill progress based on lesson category
    const course = curriculum?.courses.find(c => 
      c.lessons.some(l => l.id === lessonId)
    );
    
    if (!course) return;

    const skillIncrement = 10; // 10 points per lesson completion
    const newSkillProgress = { ...skillProgress };

    switch (course.category) {
      case 'Core Skills':
        newSkillProgress.budgeting = Math.min(100, newSkillProgress.budgeting + skillIncrement);
        break;
      case 'Investing':
        newSkillProgress.investing = Math.min(100, newSkillProgress.investing + skillIncrement);
        break;
      case 'Tax Planning':
        newSkillProgress.taxPlanning = Math.min(100, newSkillProgress.taxPlanning + skillIncrement);
        break;
      case 'Business':
        newSkillProgress.businessFinance = Math.min(100, newSkillProgress.businessFinance + skillIncrement);
        break;
      default:
        newSkillProgress.riskManagement = Math.min(100, newSkillProgress.riskManagement + skillIncrement);
    }

    setSkillProgress(newSkillProgress);
  };

  const checkQuizAchievements = async (score: number, correct: number, total: number) => {
    if (score === 100) {
      await unlockAchievement('perfect-quiz');
    }
    if (correct >= 10) {
      await unlockAchievement('quiz-master');
    }
  };

  const calculateLevel = (totalXP: number): number => {
    // Level calculation: 100 XP for level 1, then exponential growth
    if (totalXP < 100) return 1;
    return Math.floor(Math.log2(totalXP / 50)) + 1;
  };

  const getXPForNextLevel = (currentLevel: number): number => {
    return Math.pow(2, currentLevel - 1) * 100;
  };

  const checkCourseCompletion = (lessonId: string, progress: UserProgress): boolean => {
    if (!curriculum) return false;
    
    const course = curriculum.courses.find(c => 
      c.lessons.some(l => l.id === lessonId)
    );
    
    if (!course) return false;
    
    const allLessonsCompleted = course.lessons.every(lesson => 
      progress.completedLessons.includes(lesson.id)
    );
    
    if (allLessonsCompleted && !progress.completedCourses.includes(course.id)) {
      const updatedProgress = {
        ...progress,
        completedCourses: [...progress.completedCourses, course.id]
      };
      setUserProgress(updatedProgress);
      curriculumService.saveUserProgress(updatedProgress);
      return true;
    }
    
    return false;
  };

  const calculateProgress = (courseId: string) => {
    if (!curriculum) return 0;
    const course = curriculum.courses.find(c => c.id === courseId);
    if (!course) return 0;
    
    const completedLessons = course.lessons.filter(lesson => 
      userProgress.completedLessons.includes(lesson.id)
    ).length;
    
    return Math.round((completedLessons / course.lessons.length) * 100);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
  <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading Curriculum...</Text>
      </View>
    );
  }

  if (!curriculum) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load curriculum</Text>
      </View>
    );
  }

  const renderHeader = () => {
    const currentLevelXP = getXPForNextLevel(userProgress.currentLevel - 1);
    const nextLevelXP = getXPForNextLevel(userProgress.currentLevel);
    const progressToNextLevel = ((userProgress.totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    
    return (
      <View style={[styles.header, headerCollapsed && styles.headerCollapsed]}>
        <LinearGradient
          colors={theme.gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, headerCollapsed && styles.headerGradientCollapsed]}
        >
          <View style={styles.headerTopRow}>
            <Text style={[styles.headerTitle, headerCollapsed && styles.headerTitleCollapsed]} numberOfLines={1}>
              {headerCollapsed ? 'Learning' : curriculum.meta.title}
            </Text>
            <TouchableOpacity
              style={styles.headerCollapseButton}
              onPress={() => setHeaderCollapsed(prev => !prev)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={headerCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {!headerCollapsed && (
            <Text style={styles.headerSubtitle}>{curriculum.meta.description}</Text>
          )}
          <View style={[styles.statsContainer, headerCollapsed && styles.statsContainerCollapsed]}> 
            <View style={styles.statBoxSmall}>
              <Text style={styles.statNumber}>{userProgress.totalXP}</Text>
              {!headerCollapsed && <Text style={styles.statLabel}>XP</Text>}
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBoxSmall}>
              <Text style={styles.statNumber}>{userProgress.currentLevel}</Text>
              {!headerCollapsed && <Text style={styles.statLabel}>Level</Text>}
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBoxSmall}>
              <Text style={styles.statNumber}>{userProgress.completedLessons.length}</Text>
              {!headerCollapsed && <Text style={styles.statLabel}>Lessons</Text>}
            </View>
          </View>
          {!headerCollapsed && (
            <View style={styles.levelProgressContainer}>
              <Text style={styles.levelProgressText}>
                Level {userProgress.currentLevel} → {userProgress.currentLevel + 1}
              </Text>
              <View style={styles.levelProgressBar}>
                <View style={[styles.levelProgressFill, { width: `${Math.min(progressToNextLevel, 100)}%` }]} />
              </View>
              <Text style={styles.levelProgressXP}>
                {userProgress.totalXP - currentLevelXP} / {nextLevelXP - currentLevelXP} XP
              </Text>
            </View>
          )}
          {/* Embedded Tabs */}
          <View style={styles.embeddedTabsWrapper}>
            {renderNavigationTabs(true)}
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderNavigationTabs = (embedded = false) => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={[styles.tabContainer, embedded && styles.tabContainerEmbedded, headerCollapsed && embedded && styles.tabContainerEmbeddedCollapsed]}
      contentContainerStyle={[styles.tabContentContainer, embedded && styles.tabContentContainerEmbedded]}
    >
      <TouchableOpacity
        style={[styles.tab, selectedView === 'overview' && styles.activeTab]}
        onPress={() => setSelectedView('overview')}
      >
        <Ionicons name="home" size={TAB_ICON_SIZE} color={selectedView === 'overview' ? theme.colors.primary : theme.colors.muted} />
        <Text style={[styles.tabText, selectedView === 'overview' && styles.activeTabText]}>
          Overview
        </Text>
      </TouchableOpacity>
  <TouchableOpacity
        style={[styles.tab, selectedView === 'courses' && styles.activeTab]}
        onPress={() => setSelectedView('courses')}
      >
        <Ionicons name="book" size={TAB_ICON_SIZE} color={selectedView === 'courses' ? theme.colors.primary : theme.colors.muted} />
        <Text style={[styles.tabText, selectedView === 'courses' && styles.activeTabText]}>
          Courses
        </Text>
      </TouchableOpacity>
      
  <TouchableOpacity
        style={[styles.tab, selectedView === 'specializations' && styles.activeTab]}
        onPress={() => setSelectedView('specializations')}
      >
        <Ionicons name="rocket" size={TAB_ICON_SIZE} color={selectedView === 'specializations' ? theme.colors.primary : theme.colors.muted} />
        <Text style={[styles.tabText, selectedView === 'specializations' && styles.activeTabText]}>
          Advanced
        </Text>
      </TouchableOpacity>
      
  <TouchableOpacity
        style={[styles.tab, selectedView === 'certifications' && styles.activeTab]}
        onPress={() => setSelectedView('certifications')}
      >
        <Ionicons name="medal" size={TAB_ICON_SIZE} color={selectedView === 'certifications' ? theme.colors.primary : theme.colors.muted} />
        <Text style={[styles.tabText, selectedView === 'certifications' && styles.activeTabText]}>
          Certs
        </Text>
      </TouchableOpacity>
      
  <TouchableOpacity
        style={[styles.tab, selectedView === 'lessons' && styles.activeTab]}
        onPress={() => setSelectedView('lessons')}
      >
        <Ionicons name="play-circle" size={TAB_ICON_SIZE} color={selectedView === 'lessons' ? theme.colors.primary : theme.colors.muted} />
        <Text style={[styles.tabText, selectedView === 'lessons' && styles.activeTabText]}>
          Lessons
        </Text>
      </TouchableOpacity>
      
  <TouchableOpacity
        style={[styles.tab, selectedView === 'progress' && styles.activeTab]}
        onPress={() => setSelectedView('progress')}
      >
        <Ionicons name="analytics" size={TAB_ICON_SIZE} color={selectedView === 'progress' ? theme.colors.primary : theme.colors.muted} />
        <Text style={[styles.tabText, selectedView === 'progress' && styles.activeTabText]}>
          Progress
        </Text>
      </TouchableOpacity>
      
  <TouchableOpacity
        style={[styles.tab, selectedView === 'goals' && styles.activeTab]}
        onPress={() => setSelectedView('goals')}
      >
        <Ionicons name="target" size={TAB_ICON_SIZE} color={selectedView === 'goals' ? theme.colors.primary : theme.colors.muted} />
        <Text style={[styles.tabText, selectedView === 'goals' && styles.activeTabText]}>
          Goals
        </Text>
      </TouchableOpacity>
      
  <TouchableOpacity
        style={[styles.tab, selectedView === 'paths' && styles.activeTab]}
        onPress={() => setSelectedView('paths')}
      >
        <Ionicons name="map" size={TAB_ICON_SIZE} color={selectedView === 'paths' ? theme.colors.primary : theme.colors.muted} />
        <Text style={[styles.tabText, selectedView === 'paths' && styles.activeTabText]}>
          Paths
        </Text>
      </TouchableOpacity>
      
  <TouchableOpacity
        style={[styles.tab, selectedView === 'achievements' && styles.activeTab]}
        onPress={() => setSelectedView('achievements')}
      >
        <Ionicons name="trophy" size={TAB_ICON_SIZE} color={selectedView === 'achievements' ? theme.colors.primary : theme.colors.muted} />
        <Text style={[styles.tabText, selectedView === 'achievements' && styles.activeTabText]}>
          Awards
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCourse = (course: Course) => {
    const progress = calculateProgress(course.id);
    const isCompleted = userProgress.completedCourses.includes(course.id);
    
    return (
      <TouchableOpacity key={course.id} style={styles.cardTouchable} onPress={() => openCourse(course)} activeOpacity={0.9}>
        <GlassCard style={styles.courseCard}>
        <View style={styles.courseHeader}>
          <Text style={styles.courseThumbnail}>{course.thumbnail}</Text>
          <View style={styles.courseInfo}>
            <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
            <Text style={styles.courseCategory}>{course.category}</Text>
          </View>
          <View style={styles.courseMetrics}>
            <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[course.difficulty] }]}>
              <Text style={styles.difficultyText}>{course.difficulty}</Text>
            </View>
            <Text style={styles.duration}>{course.duration}</Text>
          </View>
        </View>
        
        <Text style={styles.courseDescription} numberOfLines={2}>
          {course.description}
        </Text>
        
        <View style={styles.courseFooter}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Progress: {progress}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
          <View style={styles.xpContainer}>
            <Ionicons name="star" size={16} color={theme.colors.warning} />
            <Text style={styles.xpText}>{course.xpReward} XP</Text>
          </View>
        </View>
        
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
          </View>
        )}
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const renderLearningPath = (path: LearningPath) => (
    <TouchableOpacity
      key={path.id}
      style={styles.pathCard}
      onPress={() => openPath(path)}
    >
      <View style={styles.pathHeader}>
        <Text style={styles.pathTitle}>{path.title}</Text>
        <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[path.difficulty] }]}>
          <Text style={styles.difficultyText}>{path.difficulty}</Text>
        </View>
      </View>
      <Text style={styles.pathDescription}>{path.description}</Text>
      <View style={styles.pathFooter}>
        <Text style={styles.pathTime}>⏱️ {path.estimatedTime}</Text>
        <Text style={styles.pathCourses}>📚 {path.courses.length} courses</Text>
      </View>
    </TouchableOpacity>
  );

  const renderLessonCard = (lesson: Lesson, course: Course) => {
    const isCompleted = userProgress.completedLessons.includes(lesson.id);
    
    return (
      <TouchableOpacity key={lesson.id} style={styles.cardTouchable} onPress={() => openLesson(lesson)} activeOpacity={0.9}>
        <GlassCard style={[styles.lessonCard, isCompleted && styles.completedLessonCard]}>
        <View style={styles.lessonCardHeader}>
          <View style={styles.lessonCardInfo}>
            <Text style={styles.lessonCardTitle} numberOfLines={2}>{lesson.title}</Text>
            <Text style={styles.lessonCardCourse}>{course.title}</Text>
            <Text style={styles.lessonCardCategory}>{course.category}</Text>
          </View>
          <View style={styles.lessonCardMeta}>
            <Text style={styles.lessonCardDuration}>⏱️ {lesson.duration}</Text>
            <View style={styles.lessonCardXP}>
              <Ionicons name="star" size={16} color={theme.colors.warning} />
              <Text style={styles.lessonXPText}>{lesson.xpReward} XP</Text>
            </View>
          </View>
        </View>
        
        {isCompleted && (
          <View style={styles.lessonCompletedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            <Text style={styles.lessonCompletedText}>Completed</Text>
          </View>
        )}
        
        {!isCompleted && (
          <View style={styles.lessonProgressIndicator}>
            <Ionicons name="play-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.lessonStartText}>Start Lesson</Text>
          </View>
        )}
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const getAllLessons = () => {
    if (!curriculum) return [];
    
    const allLessons: Array<{ lesson: Lesson; course: Course }> = [];
    curriculum.courses.forEach(course => {
      course.lessons.forEach(lesson => {
        allLessons.push({ lesson, course });
      });
    });
    
    return allLessons;
  };

  const renderSpecialization = (specialization: any) => {
    const isUnlocked = specialization.prerequisites.every((prereq: string) => 
      userProgress.completedCourses.includes(prereq)
    );
    
    return (
      <TouchableOpacity
        key={specialization.id}
        style={[styles.cardTouchable, !isUnlocked && styles.lockedCard]}
        onPress={() => isUnlocked ? openSpecialization(specialization) : showPrerequisitesAlert(specialization)}
        activeOpacity={0.9}
      >
        <GlassCard style={styles.specializationCard}>
          <View style={styles.specializationHeader}>
            <View style={styles.specializationIcon}>
              <Text style={styles.specializationEmoji}>{specialization.thumbnail}</Text>
            </View>
            <View style={styles.specializationInfo}>
              <Text style={styles.specializationTitle}>{specialization.title}</Text>
              <View style={[styles.difficultyBadge, { 
                backgroundColor: specialization.difficulty === 'Expert' ? theme.colors.danger : theme.colors.warning 
              }]}>
                <Text style={styles.difficultyText}>{specialization.difficulty}</Text>
              </View>
            </View>
            <View style={styles.specializationMeta}>
              <Text style={styles.specializationDuration}>⏱️ {specialization.duration}</Text>
              <View style={styles.xpContainer}>
                <Ionicons name="star" size={16} color={theme.colors.warning} />
                <Text style={styles.xpText}>{specialization.xpReward} XP</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.specializationDescription} numberOfLines={2}>
            {specialization.description}
          </Text>
          
          <View style={styles.specializationFooter}>
            <Text style={styles.specializationCategory}>{specialization.category}</Text>
            {!isUnlocked && (
              <View style={styles.lockedIndicator}>
                <Ionicons name="lock-closed" size={16} color={theme.colors.muted} />
                <Text style={styles.lockedIndicatorText}>Locked</Text>
              </View>
            )}
            {isUnlocked && (
              <View style={styles.unlockedIndicator}>
                <Ionicons name="rocket" size={16} color={theme.colors.success} />
                <Text style={styles.unlockedText}>Ready</Text>
              </View>
            )}
          </View>
          
          {specialization.accreditation && (
            <Text style={styles.accreditationText}>
              🏛️ {specialization.accreditation}
            </Text>
          )}
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const renderCertification = (certification: any) => {
    const isEligible = certification.requirements.courses.every((courseId: string) =>
      userProgress.completedCourses.includes(courseId)
    );
    
    const completedCourses = certification.requirements.courses.filter((courseId: string) =>
      userProgress.completedCourses.includes(courseId)
    ).length;
    
    const totalCourses = certification.requirements.courses.length;
    const progress = (completedCourses / totalCourses) * 100;
    
    return (
      <TouchableOpacity
        key={certification.id}
        style={[styles.cardTouchable, !isEligible && styles.lockedCard]}
        onPress={() => isEligible ? applyCertification(certification) : showCertificationRequirements(certification)}
        activeOpacity={0.9}
      >
        <GlassCard style={styles.certificationCard}>
          <View style={styles.certificationHeader}>
            <View style={styles.certificationIcon}>
              <Ionicons name="medal" size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.certificationInfo}>
              <Text style={styles.certificationTitle}>{certification.title}</Text>
              <Text style={styles.certificationIssuer}>by {certification.issuer}</Text>
              <Text style={styles.certificationRecognition}>{certification.recognition}</Text>
            </View>
          </View>
          
          <View style={styles.certificationProgress}>
            <Text style={styles.certificationProgressText}>
              Progress: {completedCourses}/{totalCourses} courses
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
          
          <View style={styles.certificationRequirements}>
            <Text style={styles.requirementsTitle}>Requirements:</Text>
            <Text style={styles.requirementsText}>
              • Complete {totalCourses} required courses
            </Text>
            <Text style={styles.requirementsText}>
              • Minimum {certification.requirements.minimumScore}% score
            </Text>
            <Text style={styles.requirementsText}>
              • Complete within {certification.requirements.timeRequirement}
            </Text>
          </View>
          
          <View style={styles.certificationFooter}>
            {isEligible ? (
              <View style={styles.eligibleIndicator}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={styles.eligibleText}>Eligible to Apply</Text>
              </View>
            ) : (
              <View style={styles.ineligibleIndicator}>
                <Ionicons name="time" size={16} color={theme.colors.muted} />
                <Text style={styles.ineligibleText}>Requirements Pending</Text>
              </View>
            )}
          </View>
          
          {certification.industryRecognition && (
            <Text style={styles.industryRecognitionText}>
              🏢 Industry Recognition: {certification.industryRecognition.join(', ')}
            </Text>
          )}
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const openSpecialization = (specialization: any) => {
    setSelectedSpecialization(specialization);
    setShowCourseModal(true); // Reuse course modal for specializations
  };

  const showPrerequisitesAlert = (specialization: any) => {
    Alert.alert(
      'Prerequisites Required',
      `Complete these courses first: ${specialization.prerequisites.join(', ')}`,
      [{ text: 'OK' }]
    );
  };

  const applyCertification = (certification: any) => {
    Alert.alert(
      'Apply for Certification',
      `Ready to apply for ${certification.title}? This will verify your completion and issue your certificate.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Apply', 
          onPress: () => {
            Alert.alert('Success!', 'Your certification application has been submitted. You will receive your certificate within 2-3 business days.');
          }
        }
      ]
    );
  };

  const showCertificationRequirements = (certification: any) => {
    const missingCourses = certification.requirements.courses.filter((courseId: string) =>
      !userProgress.completedCourses.includes(courseId)
    );
    
    Alert.alert(
      'Certification Requirements',
      `You need to complete these courses first:\n\n${missingCourses.join('\n')}`,
      [{ text: 'OK' }]
    );
  };

  const renderAchievement = (achievement: any) => {
    const isUnlocked = userProgress.achievements.includes(achievement.id);
    
    return (
      <View key={achievement.id} style={[styles.achievementCard, !isUnlocked && styles.lockedAchievement]}>
        <Text style={styles.achievementIcon}>{achievement.badgeIcon}</Text>
        <View style={styles.achievementInfo}>
          <Text style={[styles.achievementTitle, !isUnlocked && styles.lockedText]}>
            {achievement.title}
          </Text>
          <Text style={[styles.achievementDescription, !isUnlocked && styles.lockedText]}>
            {achievement.description}
          </Text>
          <Text style={styles.achievementXP}>🌟 {achievement.xpRequired} XP required</Text>
        </View>
        {isUnlocked && (
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
        )}
      </View>
    );
  };

  const renderQuizModal = () => {
    if (!selectedQuiz || !quizState) return null;

    const currentQuestion = selectedQuiz.questions[quizState.currentQuestionIndex];
    const progress = ((quizState.currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100;

    if (quizState.showResult) {
      return (
        <Modal visible={showQuizModal} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.quizResultContainer}>
              <LinearGradient
                colors={quizState.passed ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
                style={styles.resultHeader}
              >
                <Ionicons 
                  name={quizState.passed ? "checkmark-circle" : "close-circle"} 
                  size={64} 
                  color="#FFFFFF" 
                />
                <Text style={styles.resultTitle}>
                  {quizState.passed ? 'Quiz Passed!' : 'Quiz Failed'}
                </Text>
                <Text style={styles.resultScore}>
                  Score: {quizState.score}%
                </Text>
                <Text style={styles.resultDetail}>
                  {quizState.passed 
                    ? `Excellent work! You've mastered this topic.` 
                    : `You need ${selectedQuiz.passingScore}% to pass. Review the material and try again.`
                  }
                </Text>
              </LinearGradient>

              <ScrollView style={styles.quizFeedback}>
                <Text style={styles.feedbackTitle}>Detailed Feedback</Text>
                {selectedQuiz.questions.map((question, index) => {
                  const userAnswer = quizState.selectedAnswers[index];
                  const isCorrect = userAnswer === question.correctAnswer;
                  
                  return (
                    <View key={question.id} style={styles.feedbackItem}>
                      <View style={styles.feedbackHeader}>
                        <Text style={styles.questionNumber}>Q{index + 1}</Text>
                        <Ionicons 
                          name={isCorrect ? "checkmark-circle" : "close-circle"} 
                          size={20} 
                          color={isCorrect ? "#10B981" : "#EF4444"} 
                        />
                      </View>
                      <Text style={styles.feedbackQuestion}>{question.question}</Text>
                      <Text style={styles.feedbackAnswer}>
                        Your answer: {question.options[userAnswer] || 'Not answered'}
                      </Text>
                      {!isCorrect && (
                        <Text style={styles.correctAnswer}>
                          Correct answer: {question.options[question.correctAnswer]}
                        </Text>
                      )}
                      <Text style={styles.explanation}>{question.explanation}</Text>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.quizActions}>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    setQuizState({
                      currentQuestionIndex: 0,
                      selectedAnswers: new Array(selectedQuiz.questions.length).fill(-1),
                      showResult: false,
                      score: 0,
                      passed: false,
                      timeRemaining: selectedQuiz.questions.length * 120,
                      startTime: new Date(),
                    });
                  }}
                >
                  <Text style={styles.retryButtonText}>
                    {quizState.passed ? 'Retake Quiz' : 'Try Again'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowQuizModal(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      );
    }

    return (
      <Modal visible={showQuizModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.quizHeader}>
            <View style={styles.quizProgress}>
              <Text style={styles.quizProgressText}>
                Question {quizState.currentQuestionIndex + 1} of {selectedQuiz.questions.length}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
            
            {/* Timer Display */}
            <View style={styles.timerContainer}>
              <Ionicons name="time" size={16} color={quizState.timeRemaining < 60 ? "#EF4444" : theme.colors.primary} />
              <Text style={[styles.timerText, { color: quizState.timeRemaining < 60 ? "#EF4444" : theme.colors.text }]}>
                {Math.floor(quizState.timeRemaining / 60)}:{(quizState.timeRemaining % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            
            <TouchableOpacity onPress={() => {
              // Clear timer when closing
              if ((global as any).quizTimer) {
                clearInterval((global as any).quizTimer);
                (global as any).quizTimer = null;
              }
              setShowQuizModal(false);
            }}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.quizContent}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            
            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    quizState.selectedAnswers[quizState.currentQuestionIndex] === index && styles.selectedOption
                  ]}
                  onPress={() => selectAnswer(index)}
                >
                  <View style={styles.optionContent}>
                    <View style={[
                      styles.optionIndicator,
                      quizState.selectedAnswers[quizState.currentQuestionIndex] === index && styles.selectedIndicator
                    ]}>
                      <Text style={[
                        styles.optionLetter,
                        quizState.selectedAnswers[quizState.currentQuestionIndex] === index && styles.selectedLetter
                      ]}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                    </View>
                    <Text style={[
                      styles.optionText,
                      quizState.selectedAnswers[quizState.currentQuestionIndex] === index && styles.selectedOptionText
                    ]}>
                      {option}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.quizNavigation}>
            <TouchableOpacity
              style={[styles.navButton, quizState.currentQuestionIndex === 0 && styles.disabledButton]}
              onPress={previousQuestion}
              disabled={quizState.currentQuestionIndex === 0}
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton, 
                styles.nextButton,
                quizState.selectedAnswers[quizState.currentQuestionIndex] === -1 && styles.disabledButton
              ]}
              onPress={nextQuestion}
              disabled={quizState.selectedAnswers[quizState.currentQuestionIndex] === -1}
            >
              <Text style={styles.navButtonText}>
                {quizState.currentQuestionIndex === selectedQuiz.questions.length - 1 ? 'Submit' : 'Next'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderCourseModal = () => (
    <Modal visible={showCourseModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{selectedCourse?.title}</Text>
          <TouchableOpacity onPress={() => setShowCourseModal(false)}>
            <Ionicons name="close" size={24} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.courseDescription}>{selectedCourse?.description}</Text>
          
          <View style={styles.courseDetails}>
            <Text style={styles.sectionTitle}>Learning Outcomes</Text>
            {selectedCourse?.learningOutcomes.map((outcome, index) => (
              <Text key={index} style={styles.outcome}>• {outcome}</Text>
            ))}
          </View>
          
          <View style={styles.lessonsSection}>
            <Text style={styles.sectionTitle}>Lessons ({selectedCourse?.lessons.length})</Text>
            {selectedCourse?.lessons.map((lesson, index) => (
              <TouchableOpacity key={lesson.id} onPress={() => openLesson(lesson)} activeOpacity={0.9}>
                <GlassCard style={styles.lessonItem}>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonDuration}>⏱️ {lesson.duration}</Text>
                  </View>
                  <View style={styles.lessonMeta}>
                    <Text style={styles.lessonXP}>🌟 {lesson.xpReward} XP</Text>
                    {userProgress.completedLessons.includes(lesson.id) && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    )}
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderLessonModal = () => (
    <Modal visible={showLessonModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{selectedLesson?.title}</Text>
          <TouchableOpacity onPress={() => setShowLessonModal(false)}>
            <Ionicons name="close" size={24} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {selectedLesson?.content && (
            <View>
              <Text style={styles.lessonContentTitle}>Lesson Content</Text>
              <Text style={styles.lessonContent}>
                {typeof selectedLesson.content === 'object' 
                  ? selectedLesson.content.introduction || 'This lesson covers important financial concepts.'
                  : selectedLesson.content}
              </Text>
              
              {selectedLesson.content.keyPoints && (
                <View style={styles.keyPointsSection}>
                  <Text style={styles.sectionTitle}>Key Points</Text>
                  {selectedLesson.content.keyPoints.map((point: string, index: number) => (
                    <Text key={index} style={styles.keyPoint}>• {point}</Text>
                  ))}
                </View>
              )}
              
              {selectedLesson.content.saSpecificFactors && (
                <View style={styles.saFactorsSection}>
                  <Text style={styles.sectionTitle}>South African Specific Factors</Text>
                  {selectedLesson.content.saSpecificFactors.map((factor: string, index: number) => (
                    <Text key={index} style={styles.keyPoint}>• {factor}</Text>
                  ))}
                </View>
              )}
              
              {selectedLesson.content.interactiveElements && (
                <View style={styles.interactiveSection}>
                  <Text style={styles.interactiveSectionTitle}>🎯 Interactive Learning Tools</Text>
                  
                  {selectedLesson.content.interactiveElements.calculator && (
                    <TouchableOpacity
                      style={styles.interactiveButton}
                      onPress={() => {
                        setCalculatorType(selectedLesson.content.interactiveElements.calculator);
                        setCalculatorVisible(true);
                      }}
                    >
                      <Ionicons name="calculator" size={20} color="#FFFFFF" />
                      <Text style={styles.interactiveButtonText}>
                        {selectedLesson.content.interactiveElements.calculator === 'budget' ? 'Budget Calculator' : 'Compound Interest Calculator'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedLesson.content.interactiveElements.scenarios && (
                    <View style={styles.scenarioContainer}>
                      <Text style={styles.scenarioTitle}>📝 Practice Scenarios</Text>
                      {selectedLesson.content.interactiveElements.scenarios.map((scenario: string, index: number) => (
                        <TouchableOpacity
                          key={index}
                          style={[styles.scenarioButton, scenarioMode === scenario && styles.activeScenario]}
                          onPress={() => setScenarioMode(scenarioMode === scenario ? null : scenario)}
                        >
                          <Text style={[styles.scenarioButtonText, scenarioMode === scenario && styles.activeScenarioText]}>
                            {scenario.replace('_', ' ').toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  {scenarioMode && (
                    <View style={styles.scenarioContent}>
                      <Text style={styles.scenarioContentTitle}>
                        {scenarioMode === 'student' && 'Student Budget Scenario'}
                        {scenarioMode === 'working_professional' && 'Working Professional Scenario'}
                        {scenarioMode === 'family' && 'Family Budget Scenario'}
                      </Text>
                      <View style={styles.scenarioDetails}>
                        {scenarioMode === 'student' && (
                          <>
                            <Text style={styles.scenarioIncome}>💰 Income: R8,000/month (part-time + allowance)</Text>
                            <Text style={styles.scenarioExpensesTitle}>📊 Monthly Expenses:</Text>
                            <Text style={styles.scenarioExpense}>• Rent: R3,000</Text>
                            <Text style={styles.scenarioExpense}>• Food: R1,500</Text>
                            <Text style={styles.scenarioExpense}>• Transport: R800</Text>
                            <Text style={styles.scenarioExpense}>• Books: R500</Text>
                            <Text style={styles.scenarioExpense}>• Entertainment: R700</Text>
                            <Text style={styles.scenarioChallenge}>🎯 Challenge: How can you save R500/month for emergencies?</Text>
                          </>
                        )}
                        {scenarioMode === 'working_professional' && (
                          <>
                            <Text style={styles.scenarioIncome}>💰 Income: R25,000/month (after tax)</Text>
                            <Text style={styles.scenarioExpensesTitle}>📊 Monthly Expenses:</Text>
                            <Text style={styles.scenarioExpense}>• Rent: R8,000</Text>
                            <Text style={styles.scenarioExpense}>• Food: R3,000</Text>
                            <Text style={styles.scenarioExpense}>• Transport: R2,000</Text>
                            <Text style={styles.scenarioExpense}>• Insurance: R1,200</Text>
                            <Text style={styles.scenarioExpense}>• Utilities: R1,500</Text>
                            <Text style={styles.scenarioChallenge}>🎯 Challenge: Plan to save for a car deposit of R50,000 in 2 years</Text>
                          </>
                        )}
                        {scenarioMode === 'family' && (
                          <>
                            <Text style={styles.scenarioIncome}>💰 Income: R45,000/month (combined income)</Text>
                            <Text style={styles.scenarioExpensesTitle}>📊 Monthly Expenses:</Text>
                            <Text style={styles.scenarioExpense}>• Bond: R12,000</Text>
                            <Text style={styles.scenarioExpense}>• Groceries: R6,000</Text>
                            <Text style={styles.scenarioExpense}>• School fees: R4,000</Text>
                            <Text style={styles.scenarioExpense}>• Insurance: R2,500</Text>
                            <Text style={styles.scenarioExpense}>• Utilities: R2,000</Text>
                            <Text style={styles.scenarioChallenge}>🎯 Challenge: Save for children's education while building retirement fund</Text>
                          </>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {selectedLesson?.content?.link && (
                <View style={styles.linkSection}>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => Linking.openURL(selectedLesson?.content?.link)}
                  >
                    <Ionicons name="link" size={18} color="#FFFFFF" />
                    <Text style={styles.linkButtonText}>Open Official Page</Text>
                  </TouchableOpacity>
                  {selectedLesson?.content?.disclaimer && (
                    <Text style={styles.linkDisclaimer}>
                      {selectedLesson.content.disclaimer}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
          
          <View style={styles.lessonActions}>
            {/* Interactive Tools Section */}
            {selectedLesson?.content?.interactiveElements && (
              <View style={styles.interactiveSection}>
                <Text style={styles.interactiveSectionTitle}>Interactive Learning Tools</Text>
                
                {selectedLesson.content.interactiveElements.calculator === 'budget' && (
                  <TouchableOpacity
                    style={styles.interactiveButton}
                    onPress={() => setShowInteractiveTools(!showInteractiveTools)}
                  >
                    <Ionicons name="calculator" size={20} color="#FFFFFF" />
                    <Text style={styles.interactiveButtonText}>Budget Calculator</Text>
                  </TouchableOpacity>
                )}
                
                {selectedLesson.content.interactiveElements.calculator === 'compound_interest' && (
                  <TouchableOpacity
                    style={styles.interactiveButton}
                    onPress={() => setShowInteractiveTools(!showInteractiveTools)}
                  >
                    <Ionicons name="calculator" size={20} color="#FFFFFF" />
                    <Text style={styles.interactiveButtonText}>Compound Interest Calculator</Text>
                  </TouchableOpacity>
                )}
                
                {showInteractiveTools && selectedLesson.content.interactiveElements.calculator === 'budget' && renderBudgetCalculator()}
                {showInteractiveTools && selectedLesson.content.interactiveElements.calculator === 'compound_interest' && renderCompoundInterestCalculator()}
              </View>
            )}
            
            {/* Quiz and Complete Buttons */}
            {selectedLesson?.quiz && (
              <>
                <Text style={styles.readingGateText}>
                  {readingElapsed < MIN_READING_TIME_BEFORE_QUIZ
                    ? `Read the lesson before attempting the quiz. (${readingElapsed}s / ${MIN_READING_TIME_BEFORE_QUIZ}s)`
                    : 'You can now attempt the quiz.'}
                </Text>
                <TouchableOpacity
                  style={[styles.quizButton, readingElapsed < MIN_READING_TIME_BEFORE_QUIZ && styles.quizButtonDisabled]}
                  disabled={readingElapsed < MIN_READING_TIME_BEFORE_QUIZ}
                  onPress={() => {
                    setShowLessonModal(false);
                    startQuiz(selectedLesson);
                  }}
                >
                  <Ionicons name="help-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.quizButtonText}>Take Quiz ({selectedLesson.quiz.questions.length} questions)</Text>
                </TouchableOpacity>
              </>
            )}
            {!selectedLesson?.quiz && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => {
                  if (selectedLesson?.id) {
                    completeLesson(selectedLesson.id, selectedLesson.xpReward || 0);
                  }
                }}
              >
                <Text style={styles.completeButtonText}>Complete Lesson (+{selectedLesson?.xpReward} XP)</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // Enhanced Progress View
  const renderProgressView = () => (
    <View style={styles.progressViewContainer}>
      {/* Study Streak */}
      <GlassCard style={styles.streakCard}>
        <View style={styles.streakHeader}>
          <Ionicons name="flame" size={32} color="#FF6B35" />
          <View style={styles.streakInfo}>
            <Text style={styles.streakTitle}>Study Streak</Text>
            <Text style={styles.streakCount}>{dailyStreak} days</Text>
          </View>
        </View>
      </GlassCard>

      {/* Skill Progress */}
      <GlassCard style={styles.skillsCard}>
        <Text style={styles.cardTitle}>Skills Progress</Text>
        {Object.entries(skillProgress).map(([skill, progress]) => (
          <View key={skill} style={styles.skillItem}>
            <View style={styles.skillHeader}>
              <Text style={styles.skillName}>{skill.replace(/([A-Z])/g, ' $1').trim()}</Text>
              <Text style={styles.skillPercentage}>{Math.round(progress as number)}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFull, { width: `${progress}%` }]} />
            </View>
          </View>
        ))}
      </GlassCard>

      {/* Weekly Stats */}
      <GlassCard style={styles.statsCard}>
        <Text style={styles.cardTitle}>This Week</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{studySessions.length}h</Text>
            <Text style={styles.statsLabel}>Study Time</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>{userProgress.completedLessons.length}</Text>
            <Text style={styles.statsLabel}>Lessons</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={24} color={theme.colors.warning} />
            <Text style={styles.statValue}>{userProgress.totalXP}</Text>
            <Text style={styles.statsLabel}>XP Earned</Text>
          </View>
        </View>
      </GlassCard>

      {/* Recent Activity */}
      <GlassCard style={styles.activityCard}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        {studySessions.slice(-5).map((session, index) => (
          <View key={session.id} style={styles.activityItem}>
            <Ionicons name="play-circle" size={20} color={theme.colors.primary} />
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>Study Session</Text>
              <Text style={styles.activityTime}>
                {session.startTime.toLocaleDateString()}
              </Text>
            </View>
            {session.score && (
              <Text style={styles.activityScore}>{session.score}%</Text>
            )}
          </View>
        ))}
      </GlassCard>
    </View>
  );

  // Goals View
  const renderGoalsView = () => (
    <View style={styles.goalsViewContainer}>
      {/* Goals Header */}
      <View style={styles.goalsHeader}>
        <Text style={styles.sectionHeaderText}>Learning Goals</Text>
        <TouchableOpacity 
          style={styles.addGoalButton}
          onPress={() => setShowGoalsModal(true)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addGoalText}>Add Goal</Text>
        </TouchableOpacity>
      </View>

      {/* Active Goals */}
      {learningGoals.map((goal) => (
        <GlassCard key={goal.id} style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: 
              goal.priority === 'high' ? '#EF4444' : 
              goal.priority === 'medium' ? '#F59E0B' : '#10B981' 
            }]}>
              <Text style={styles.priorityText}>{goal.priority}</Text>
            </View>
          </View>
          <Text style={styles.goalDescription}>{goal.description}</Text>
          
          <View style={styles.goalProgress}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPercentage}>{Math.round(goal.progress)}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFull, { width: `${goal.progress}%` }]} />
            </View>
          </View>

          <View style={styles.goalFooter}>
            <Text style={styles.goalTarget}>
              Target: {goal.targetDate.toLocaleDateString()}
            </Text>
            <Text style={styles.goalCourses}>
              {goal.coursesRequired.length} courses required
            </Text>
          </View>
        </GlassCard>
      ))}

      {learningGoals.length === 0 && (
        <GlassCard style={styles.emptyGoalsCard}>
          <Ionicons name="target" size={48} color={theme.colors.muted} />
          <Text style={styles.emptyGoalsTitle}>No Goals Set</Text>
          <Text style={styles.emptyGoalsDescription}>
            Set learning goals to track your progress and stay motivated
          </Text>
          <TouchableOpacity 
            style={styles.setFirstGoalButton}
            onPress={() => setShowGoalsModal(true)}
          >
            <Text style={styles.setFirstGoalText}>Set Your First Goal</Text>
          </TouchableOpacity>
        </GlassCard>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
  {renderHeader()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedView === 'overview' && (
          <View style={styles.overviewContainer}>
            <Text style={styles.sectionHeaderText}>Continue Your Journey</Text>
            <Text style={styles.sectionSubtext}>Recommended next lesson based on your progress</Text>
            {(() => {
              const getNextLesson = () => {
                if (!curriculum) return null;
                for (const course of curriculum.courses) {
                  for (const lesson of course.lessons) {
                    if (!userProgress.completedLessons.includes(lesson.id)) {
                      return { course, lesson };
                    }
                  }
                }
                return null;
              };
              const nextData = getNextLesson();
              if (!nextData) {
                return (
                  <GlassCard style={styles.completedAllCard}>
                    <Ionicons name="trophy" size={48} color={theme.colors.success} />
                    <Text style={styles.completedAllTitle}>All Lessons Completed!</Text>
                    <Text style={styles.completedAllSubtitle}>Great job—explore specializations or certifications next.</Text>
                  </GlassCard>
                );
              }
              const { course, lesson } = nextData;
              return (
                <TouchableOpacity onPress={() => openLesson(lesson)} activeOpacity={0.9}>
                  <GlassCard style={styles.nextLessonCard}>
                    <View style={styles.nextLessonHeader}>
                      <Text style={styles.nextLessonTitle}>{lesson.title}</Text>
                      <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[course.difficulty] }]}> 
                        <Text style={styles.difficultyText}>{course.difficulty}</Text>
                      </View>
                    </View>
                    <Text style={styles.nextLessonCourse}>{course.title}</Text>
                    <Text style={styles.nextLessonDescription} numberOfLines={3}>
                      {typeof lesson.content === 'object' ? (lesson.content.introduction || 'Learn key financial concepts.') : 'Learn key financial concepts.'}
                    </Text>
                    <View style={styles.nextLessonMeta}>
                      <Text style={styles.nextLessonDuration}>⏱️ {lesson.duration}</Text>
                      <Text style={styles.nextLessonXP}>🌟 {lesson.xpReward} XP</Text>
                    </View>
                    <View style={styles.startNextLessonButton}>
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                      <Text style={styles.startNextLessonText}>Start Lesson</Text>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })()}
          </View>
        )}
        {selectedView === 'courses' && (
          <View style={styles.coursesContainer}>
            {curriculum.courses.map(renderCourse)}
          </View>
        )}
        
        {selectedView === 'specializations' && (
          <View style={styles.specializationsContainer}>
            <Text style={styles.sectionHeaderText}>
              Advanced Specializations ({specializations.length})
            </Text>
            <Text style={styles.sectionSubtext}>
              Master cutting-edge financial technology and advanced concepts
            </Text>
            {specializations.map(renderSpecialization)}
          </View>
        )}
        
        {selectedView === 'certifications' && (
          <View style={styles.certificationsContainer}>
            <Text style={styles.sectionHeaderText}>
              Professional Certifications ({certifications.length})
            </Text>
            <Text style={styles.sectionSubtext}>
              Earn industry-recognized credentials for your expertise
            </Text>
            {userLevel && (
              <GlassCard style={styles.userLevelCard}>
                <View style={styles.userLevelHeader}>
                  <Ionicons name="star" size={24} color={theme.colors.primary} />
                  <Text style={styles.userLevelTitle}>
                    Current Level: {userLevel.title}
                  </Text>
                </View>
                <Text style={styles.userLevelXP}>
                  {userProgress.totalXP} XP earned
                </Text>
                <Text style={styles.userLevelPerks}>
                  Perks: {userLevel.perks.join(', ')}
                </Text>
              </GlassCard>
            )}
            {certifications.map(renderCertification)}
          </View>
        )}
        
        {selectedView === 'lessons' && (
          <View style={styles.lessonsContainer}>
            <Text style={styles.sectionHeaderText}>
              All Lessons ({getAllLessons().length})
            </Text>
            <Text style={styles.sectionSubtext}>
              Browse and start any lesson directly
            </Text>
            {getAllLessons().map(({ lesson, course }) => 
              renderLessonCard(lesson, course)
            )}
          </View>
        )}
        
        {selectedView === 'paths' && (
          <View style={styles.pathsContainer}>
            {curriculum.learningPaths.map(renderLearningPath)}
          </View>
        )}
        
        {selectedView === 'achievements' && (
          <View style={styles.achievementsContainer}>
            {curriculum.achievements.map(renderAchievement)}
          </View>
        )}

        {selectedView === 'progress' && (
          <View style={styles.progressContainer}>
            {renderProgressView()}
          </View>
        )}

        {selectedView === 'goals' && (
          <View style={styles.goalsContainer}>
            {renderGoalsView()}
          </View>
        )}
      </ScrollView>
      
      {renderCourseModal()}
      {renderLessonModal()}
      {renderQuizModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    marginBottom: 20,
  },
  headerCollapsed: {
    marginBottom: 6,
  },
  headerGradient: {
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerGradientCollapsed: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCollapseButton: {
    marginLeft: 8,
    padding: 4,
  },
  headerTitleCollapsed: {
    fontSize: 18,
    marginBottom: 0,
    textAlign: 'left',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsContainerCollapsed: {
    marginTop: 4,
  },
  statBoxSmall: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 6,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 6,
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabContainerEmbedded: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 0,
    marginBottom: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  tabContainerEmbeddedCollapsed: {
    paddingVertical: 0,
  },
  embeddedTabsWrapper: {
    marginTop: 12,
  },
  tabContentContainerEmbedded: {
    flexGrow: 0,
  },
  tabContentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexGrow: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    minWidth: 56,
    height: 26,
    marginHorizontal: 1,
  },
  activeTab: {
    backgroundColor: theme.colors.cardAlt,
  },
  tabText: {
    marginLeft: 2,
  fontSize: 12,
  lineHeight: 14,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  coursesContainer: {
    paddingHorizontal: 20,
  },
  cardTouchable: {
    marginBottom: 16,
  },
  courseCard: {
    position: 'relative',
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseThumbnail: {
    fontSize: 32,
    marginRight: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  courseCategory: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  courseMetrics: {
    alignItems: 'flex-end',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  difficultyText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  duration: {
    fontSize: 12,
  color: theme.colors.muted,
  },
  courseDescription: {
    fontSize: 14,
  color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressText: {
    fontSize: 12,
  color: theme.colors.muted,
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
  backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
  backgroundColor: theme.colors.success,
    borderRadius: 2,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpText: {
    fontSize: 12,
  color: theme.colors.warning,
    fontWeight: '600',
    marginLeft: 4,
  },
  completedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  pathsContainer: {
    paddingHorizontal: 20,
  },
  pathCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pathTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: 12,
  },
  pathDescription: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  pathFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pathTime: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  pathCourses: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  achievementsContainer: {
    paddingHorizontal: 20,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lockedAchievement: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  color: theme.colors.text,
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
  color: theme.colors.muted,
    marginBottom: 4,
  },
  achievementXP: {
    fontSize: 12,
  color: theme.colors.warning,
    fontWeight: '600',
  },
  lockedText: {
  color: theme.colors.muted,
  },
  modalContainer: {
    flex: 1,
  backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: theme.colors.border,
  backgroundColor: theme.colors.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  color: theme.colors.text,
    flex: 1,
    marginRight: 16,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  courseDetails: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  color: theme.colors.text,
    marginBottom: 12,
  },
  outcome: {
    fontSize: 14,
  color: theme.colors.muted,
    marginBottom: 8,
    lineHeight: 20,
  },
  lessonsSection: {
    marginBottom: 24,
  },
  lessonItem: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 4,
  marginBottom: 12,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '600',
  color: theme.colors.text,
    marginBottom: 4,
  },
  lessonDuration: {
    fontSize: 12,
  color: theme.colors.muted,
  },
  lessonMeta: {
    alignItems: 'flex-end',
  },
  lessonXP: {
    fontSize: 12,
  color: theme.colors.warning,
    fontWeight: '600',
    marginBottom: 4,
  },
  lessonContent: {
    fontSize: 14,
  color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 24,
  },
  lessonContentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  color: theme.colors.text,
    marginBottom: 12,
  },
  keyPointsSection: {
    marginBottom: 20,
  },
  saFactorsSection: {
    marginBottom: 20,
  },
  keyPoint: {
    fontSize: 14,
  color: theme.colors.muted,
    marginBottom: 8,
    lineHeight: 20,
    paddingLeft: 8,
  },
  completeButton: {
  backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  completeButtonWithQuiz: {
    marginTop: 0,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  color: theme.colors.muted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: 16,
  color: theme.colors.danger,
  },
  levelProgressContainer: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  levelProgressText: {
    fontSize: 12,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 8,
  },
  levelProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 4,
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  levelProgressXP: {
    fontSize: 10,
    color: '#E2E8F0',
    textAlign: 'center',
  },
  lessonsContainer: {
    paddingHorizontal: 20,
  },
  sectionHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
  color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: 14,
  color: theme.colors.muted,
    marginBottom: 20,
  },
  lessonCard: {
  padding: 0,
  marginBottom: 0,
    borderLeftWidth: 4,
  borderLeftColor: theme.colors.primary,
  },
  completedLessonCard: {
  borderLeftColor: theme.colors.success,
  backgroundColor: theme.colors.cardAlt,
  },
  lessonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  lessonCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  lessonCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  color: theme.colors.text,
    marginBottom: 4,
  },
  lessonCardCourse: {
    fontSize: 14,
  color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  lessonCardCategory: {
    fontSize: 12,
  color: theme.colors.muted,
  },
  lessonCardMeta: {
    alignItems: 'flex-end',
  },
  lessonCardDuration: {
    fontSize: 12,
  color: theme.colors.muted,
    marginBottom: 4,
  },
  lessonCardXP: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonXPText: {
    fontSize: 12,
  color: theme.colors.warning,
    fontWeight: '600',
    marginLeft: 4,
  },
  lessonCompletedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonCompletedText: {
    fontSize: 12,
  color: theme.colors.success,
    fontWeight: '600',
    marginLeft: 8,
  },
  lessonProgressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonStartText: {
    fontSize: 12,
  color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Quiz-specific styles
  lessonActions: {
    marginTop: 20,
  },
  quizButton: {
  backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quizButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  quizButtonDisabled: {
    opacity: 0.5,
  },
  readingGateText: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: theme.colors.border,
  backgroundColor: theme.colors.card,
  },
  quizProgress: {
    flex: 1,
    marginRight: 16,
  },
  quizProgressText: {
    fontSize: 14,
    fontWeight: '600',
  color: theme.colors.text,
    marginBottom: 8,
  },
  quizContent: {
    flex: 1,
    padding: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
  color: theme.colors.text,
    lineHeight: 24,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
  backgroundColor: theme.colors.card,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedOption: {
  borderColor: theme.colors.primary,
  backgroundColor: theme.colors.cardAlt,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
  backgroundColor: theme.colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedIndicator: {
  backgroundColor: theme.colors.primary,
  },
  optionLetter: {
    fontSize: 14,
    fontWeight: 'bold',
  color: theme.colors.muted,
  },
  selectedLetter: {
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  color: theme.colors.text,
    lineHeight: 22,
  },
  selectedOptionText: {
  color: theme.colors.text,
    fontWeight: '500',
  },
  quizNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  backgroundColor: theme.colors.card,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: theme.colors.border,
  },
  navButton: {
  backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
    justifyContent: 'center',
  },
  nextButton: {
  backgroundColor: theme.colors.success,
  },
  disabledButton: {
  backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  quizResultContainer: {
    flex: 1,
  },
  resultHeader: {
    padding: 40,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  resultScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  resultDetail: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  quizFeedback: {
    flex: 1,
    padding: 20,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  color: theme.colors.text,
    marginBottom: 20,
  },
  feedbackItem: {
  backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  color: theme.colors.primary,
  },
  feedbackQuestion: {
    fontSize: 16,
    fontWeight: '600',
  color: theme.colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  feedbackAnswer: {
    fontSize: 14,
  color: theme.colors.muted,
    marginBottom: 4,
  },
  correctAnswer: {
    fontSize: 14,
  color: theme.colors.success,
    fontWeight: '600',
    marginBottom: 8,
  },
  explanation: {
    fontSize: 14,
  color: theme.colors.muted,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  quizActions: {
    padding: 20,
    gap: 12,
  },
  continueButton: {
  backgroundColor: theme.colors.success,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
  backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
  backgroundColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkSection: {
    marginTop: 16,
    gap: 8,
  },
  linkButton: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  linkDisclaimer: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  
  // Interactive Learning Styles
  interactiveSection: {
    marginBottom: 20,
    padding: 16,
  backgroundColor: theme.colors.cardAlt,
    borderRadius: 12,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: theme.colors.border,
  },
  interactiveSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  color: theme.colors.text,
    marginBottom: 12,
  },
  interactiveButton: {
  backgroundColor: theme.colors.primaryDark,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  interactiveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  calculatorContainer: {
    padding: 16,
  backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calculatorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  color: theme.colors.text,
    marginBottom: 8,
  },
  calculatorDescription: {
    fontSize: 14,
  color: theme.colors.muted,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  color: theme.colors.text,
    marginBottom: 8,
  },
  calculatorInput: {
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  backgroundColor: theme.colors.cardAlt,
  color: theme.colors.text,
  },
  calculatorResults: {
    marginTop: 16,
    padding: 16,
  backgroundColor: theme.colors.cardAlt,
    borderRadius: 8,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: theme.colors.success,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
  color: theme.colors.text,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 16,
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  highlightedResult: {
    fontSize: 18,
    color: theme.colors.success,
  },
  
  // Enhanced Progress View Styles
  progressViewContainer: {
    flex: 1,
    padding: 16,
  },
  overviewContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  nextLessonCard: {
    marginTop: 12,
    padding: 16,
  },
  nextLessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextLessonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    marginRight: 12,
  },
  nextLessonCourse: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 6,
  },
  nextLessonDescription: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
    marginBottom: 12,
  },
  nextLessonMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nextLessonDuration: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  nextLessonXP: {
    fontSize: 12,
    color: theme.colors.warning,
    fontWeight: '600',
  },
  startNextLessonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startNextLessonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  completedAllCard: {
    marginTop: 12,
    padding: 24,
    alignItems: 'center',
  },
  completedAllTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  completedAllSubtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  streakCard: {
    marginBottom: 16,
    padding: 16,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakInfo: {
    marginLeft: 12,
  },
  streakTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
  streakCount: {
    fontSize: 24,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  skillsCard: {
    marginBottom: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 16,
  },
  skillItem: {
    marginBottom: 12,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillName: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  skillPercentage: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFull: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  statsCard: {
    marginBottom: 16,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    color: theme.colors.text,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  activityCard: {
    marginBottom: 16,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  activityScore: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '600',
  },
  
  // Goals View Styles
  goalsViewContainer: {
    flex: 1,
    padding: 16,
  },
  goalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addGoalText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  goalCard: {
    marginBottom: 16,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  goalDescription: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 12,
  },
  goalProgress: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTarget: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  goalCourses: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  emptyGoalsCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyGoalsTitle: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyGoalsDescription: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  setFirstGoalButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  setFirstGoalText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Timer Styles
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Specializations Styles
  specializationsContainer: {
    padding: 16,
  },
  specializationCard: {
    marginBottom: 16,
    padding: 16,
  },
  specializationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  specializationIcon: {
    marginRight: 12,
  },
  specializationEmoji: {
    fontSize: 32,
  },
  specializationInfo: {
    flex: 1,
  },
  specializationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  specializationMeta: {
    alignItems: 'flex-end',
  },
  specializationDuration: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  specializationDescription: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
    marginBottom: 12,
  },
  specializationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specializationCategory: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  lockedCard: {
    opacity: 0.6,
  },
  lockedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedIndicatorText: {
    fontSize: 12,
    color: theme.colors.muted,
    marginLeft: 4,
  },
  unlockedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unlockedText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '600',
    marginLeft: 4,
  },
  accreditationText: {
    fontSize: 11,
    color: theme.colors.muted,
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Certifications Styles
  certificationsContainer: {
    padding: 16,
  },
  userLevelCard: {
    marginBottom: 20,
    padding: 16,
  },
  userLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userLevelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: 8,
  },
  userLevelXP: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  userLevelPerks: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  certificationCard: {
    marginBottom: 16,
    padding: 16,
  },
  certificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  certificationIcon: {
    marginRight: 16,
  },
  certificationInfo: {
    flex: 1,
  },
  certificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  certificationIssuer: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  certificationRecognition: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  certificationProgress: {
    marginBottom: 16,
  },
  certificationProgressText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 8,
  },
  certificationRequirements: {
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  requirementsText: {
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  certificationFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  eligibleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eligibleText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '600',
    marginLeft: 4,
  },
  ineligibleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ineligibleText: {
    fontSize: 12,
    color: theme.colors.muted,
    marginLeft: 4,
  },
  industryRecognitionText: {
    fontSize: 11,
    color: theme.colors.muted,
    fontStyle: 'italic',
    marginTop: 12,
  },
});
