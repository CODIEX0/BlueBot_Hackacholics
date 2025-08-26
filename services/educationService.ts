/**
 * Financial Education Service
 * Provides comprehensive financial literacy content and courses for South African users
 * Features world-class curriculum meeting international education standards
 */

// Import the comprehensive curriculum data
import curriculumData from '../data/financial-education-curriculum.json';

export interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string; // e.g., "8 hours"
  lessons: Lesson[];
  category: 'Foundations' | 'Budgeting' | 'Saving' | 'Investing' | 'Credit' | 'Insurance' | 'Crypto' | 'Tax' | 'Business' | 'Estate' | 'Advanced';
  thumbnail: string;
  xpReward: number;
  completed: boolean;
  progress: number; // 0-100
  prerequisites: string[];
  learningOutcomes: string[];
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'video' | 'quiz' | 'interactive';
  duration: string;
  xpReward: number;
  completed: boolean;
  quiz?: Quiz;
}

export interface Quiz {
  questions: QuizQuestion[];
  passingScore: number; // percentage
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
  explanation: string;
}

export interface UserProgress {
  totalXP: number;
  level: number;
  completedCourses: string[];
  completedLessons: string[];
  achievements: Achievement[];
  streakDays: number;
  lastStudyDate: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt?: string;
  requirements: {
    type: 'courses_completed' | 'lessons_completed' | 'quiz_perfect' | 'streak_days' | 'xp_earned';
    target: number;
  };
}

class FinancialEducationService {
  private courses: Course[] = [];
  private achievements: Achievement[] = [];

  constructor() {
    this.loadCurriculumData();
  }

  private loadCurriculumData() {
    // Load courses from JSON curriculum
    this.courses = curriculumData.courses.map(course => ({
      ...course,
      difficulty: course.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
      category: course.category as Course['category'],
      completed: false,
      progress: 0,
      lessons: course.lessons.map(lesson => ({
        ...lesson,
        type: lesson.type as 'text' | 'video' | 'quiz' | 'interactive',
        completed: false
      }))
    }));

    // Load achievements from JSON
    this.achievements = curriculumData.achievements.map(achievement => ({
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.badgeIcon,
      xpReward: achievement.xpRequired,
      requirements: {
        type: 'xp_earned' as const,
        target: achievement.xpRequired
      }
    }));
  }

  getCourses(): Course[] {
    return this.courses;
  }

  getCurriculumInfo() {
    return curriculumData.meta;
  }

  getDailyTip(): string {
    const tips = (curriculumData as any).dailyTips || [
      "Start tracking your expenses today to understand where your money goes.",
      "Set aside at least 10% of your income for emergency savings.",
      "Compare prices before making major purchases to save money.",
      "Review your bank statements monthly to catch any errors or fraud.",
      "Pay off high-interest debt first to save money on interest charges.",
      "Consider investing in low-cost index funds for long-term growth.",
      "Create a budget and stick to it to achieve your financial goals."
    ];
    const today = new Date().getDate();
    return tips[today % tips.length];
  }

  getGlossary() {
    return (curriculumData as any).glossary || {};
  }

  getCourse(courseId: string): Course | null {
    return this.courses.find(course => course.id === courseId) || null;
  }

  getCoursesByCategory(category: Course['category']): Course[] {
    return this.courses.filter(course => course.category === category);
  }

  getLesson(courseId: string, lessonId: string): Lesson | null {
    const course = this.getCourse(courseId);
    if (!course) return null;
    
    return course.lessons.find(lesson => lesson.id === lessonId) || null;
  }

  async completeLesson(courseId: string, lessonId: string): Promise<{
    xpEarned: number;
    achievementsUnlocked: Achievement[];
    levelUp: boolean;
  }> {
    const course = this.getCourse(courseId);
    const lesson = this.getLesson(courseId, lessonId);
    
    if (!course || !lesson) {
      throw new Error('Course or lesson not found');
    }

    // Mark lesson as completed
    lesson.completed = true;
    
    // Update course progress
    const completedLessons = course.lessons.filter(l => l.completed).length;
    course.progress = Math.round((completedLessons / course.lessons.length) * 100);
    
    // Check if course is completed
    if (course.progress === 100) {
      course.completed = true;
    }

    // Calculate XP and achievements
    const xpEarned = lesson.xpReward;
    const achievementsUnlocked = this.checkAchievements();
    const currentLevel = this.calculateLevel();
    
    // Simulate level up check
    const levelUp = false; // Implement level calculation logic

    return {
      xpEarned,
      achievementsUnlocked,
      levelUp
    };
  }

  async submitQuizAnswers(
    courseId: string, 
    lessonId: string, 
    answers: number[]
  ): Promise<{
    score: number;
    passed: boolean;
    feedback: Array<{
      question: string;
      correct: boolean;
      explanation: string;
    }>;
  }> {
    const lesson = this.getLesson(courseId, lessonId);
    
    if (!lesson || !lesson.quiz) {
      throw new Error('Quiz not found');
    }

    const quiz = lesson.quiz;
    let correctAnswers = 0;
    const feedback = quiz.questions.map((question, index) => {
      const isCorrect = answers[index] === question.correctAnswer;
      if (isCorrect) correctAnswers++;
      
      return {
        question: question.question,
        correct: isCorrect,
        explanation: question.explanation
      };
    });

    const score = Math.round((correctAnswers / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    if (passed) {
      await this.completeLesson(courseId, lessonId);
    }

    return {
      score,
      passed,
      feedback
    };
  }

  getAchievements(): Achievement[] {
    return this.achievements;
  }

  private checkAchievements(): Achievement[] {
    // Logic to check which achievements have been unlocked
    // This would integrate with user progress data
    return [];
  }

  private calculateLevel(): number {
    // Calculate user level based on total XP
    // Example: Level = Math.floor(totalXP / 100) + 1
    return 1;
  }

  getTotalXP(): number {
    // Calculate total XP from completed lessons and achievements
    return this.courses.reduce((total, course) => {
      return total + course.lessons.reduce((courseTotal, lesson) => {
        return courseTotal + (lesson.completed ? lesson.xpReward : 0);
      }, 0);
    }, 0);
  }

  getRecommendedCourses(): Course[] {
    // Return courses recommended for the user based on their progress
    const incompleteCourses = this.courses.filter(course => !course.completed);
    
    // Prioritize beginner courses and check prerequisites
    return incompleteCourses
      .filter(course => this.checkPrerequisites(course))
      .sort((a, b) => {
        if (a.difficulty === 'Beginner' && b.difficulty !== 'Beginner') return -1;
        if (b.difficulty === 'Beginner' && a.difficulty !== 'Beginner') return 1;
        return 0;
      })
      .slice(0, 3);
  }

  private checkPrerequisites(course: Course): boolean {
    if (!course.prerequisites || course.prerequisites.length === 0) {
      return true;
    }
    
    return course.prerequisites.every(prereqId => {
      const prereqCourse = this.getCourse(prereqId);
      return prereqCourse?.completed || false;
    });
  }

  // Advanced learning analytics
  getLearningStats(): {
    totalCourses: number;
    completedCourses: number;
    totalLessons: number;
    completedLessons: number;
    totalXP: number;
    currentLevel: number;
    completionRate: number;
  } {
    const totalCourses = this.courses.length;
    const completedCourses = this.courses.filter(c => c.completed).length;
    const totalLessons = this.courses.reduce((sum, course) => sum + course.lessons.length, 0);
    const completedLessons = this.courses.reduce((sum, course) => 
      sum + course.lessons.filter(l => l.completed).length, 0);
    
    return {
      totalCourses,
      completedCourses,
      totalLessons,
      completedLessons,
      totalXP: this.getTotalXP(),
      currentLevel: this.calculateLevel(),
      completionRate: Math.round((completedCourses / totalCourses) * 100)
    };
  }

  // Get personalized learning path
  getPersonalizedLearningPath(): Course[] {
    const availableCourses = this.courses.filter(course => 
      !course.completed && this.checkPrerequisites(course)
    );

    // Sort by difficulty and relevance
    return availableCourses.sort((a, b) => {
      const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });
  }
}

export default new FinancialEducationService();
