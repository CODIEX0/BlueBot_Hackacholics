import React from 'react';
const { useState, useEffect, useRef, useCallback } = React;
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '@/config/theme';
import { useRouter } from 'expo-router';
import MultiAI from '../../services/MultiAI';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StandardBank from '../../services/StandardBankService';
import { useMobileDatabase } from '../../contexts/MobileDatabaseContext';
import { useMobileAuth } from '../../contexts/MobileAuthContext';
import Voice from '../../services/VoiceInteraction';

// Icon wrapper component to handle icon rendering
const Icon = ({ name, size, color }: { name: string; size: number; color: string }) => {
  const IconLib = Ionicons as any;
  return <IconLib name={name} size={size} color={color} />;
};

interface Message {
  id: string;
  text: string;
  user: boolean;
  timestamp: Date;
  type?: 'tip' | 'warning' | 'insight' | 'action' | 'suggestion';
  actions?: MessageAction[];
}

interface MessageAction {
  id: string;
  label: string;
  action: () => void;
}

interface QuickAction {
  id: string;
  text: string;
  icon: React.ReactNode;
  category: 'analysis' | 'advice' | 'education' | 'goal' | 'receipt';
}

export default function AIChat() {
  const insets = useSafeAreaInsets();
  const { user } = useMobileAuth();
  const { expenses, getExpensesByDateRange } = useMobileDatabase();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatContext, setChatContext] = useState<any>({});
  const [selectedProvider, setSelectedProvider] = useState<string>(MultiAI.getCurrentProviderKey?.() || 'deepseek');
  const [availableProviders, setAvailableProviders] = useState<{ key: string; name: string; model: string; available: boolean }[]>([]);
  // Multi-agent selection
  const [agent, setAgent] = useState<'blue' | 'penny' | 'sable' | 'zuri' | 'kora'>('blue');

  // Load persisted agent on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('ai.selectedAgent');
        if (saved === 'blue' || saved === 'penny' || saved === 'sable' || saved === 'zuri' || saved === 'kora') {
          setAgent(saved as any);
        }
      } catch {}
    })();
  }, []);

  // Persist agent changes
  useEffect(() => {
    AsyncStorage.setItem('ai.selectedAgent', agent).catch(() => {});
  }, [agent]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Voice state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    // initialize voice on mount
    (async () => {
      await Voice.initialize();
      Voice.setEnabled(true);
      setVoiceEnabled(true);
      // Optional greeting
      try { await Voice.speakGreeting('afternoon'); } catch {}
    })();
  }, []);

  // Handle suggestion clicks
  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
  };

  // Handle action requirements from AI
  const handleActionRequired = (actionRequired: any) => {
    switch (actionRequired.type) {
      case 'create_budget':
        Alert.alert('Budget Helper', 'Let me help you create a budget! Go to the Expenses tab to set up your budget categories.');
        break;
      case 'set_goal':
        Alert.alert('Goal Setting', 'Ready to set a financial goal? Check out the Goals section in your profile.');
        break;
      case 'track_expense':
        Alert.alert('Expense Tracking', 'Start tracking your expenses in the Expenses tab for better financial insights.');
        break;
      case 'educate':
      case 'learn_more':
        router.push('/(tabs)/learn');
        break;
      default:
        break;
    }
  };

  // Send message to AI using MultiAI service
  const sendMessageToAI = async (message: string) => {
    try {
      setIsLoading(true);
      
      // Use real chatContext for userBalance, recentExpenses, etc.
      const context = {
        userBalance: user?.balance ?? 0, // Use real user balance if available
        recentExpenses: chatContext.recentExpenses?.slice(0, 5) || [],
        financialGoals: user?.goals || [], // Use real user goals if available
      };

      // Lightweight intent-based provider selection (pre-switch only)
      try {
        const m = message.toLowerCase();
        // Prefer Gemini for education/explainers; DeepSeek/OpenAI for analysis; HF for quick low-cost
        if (/explain|what is|meaning of|define|learn|education|teach/.test(m)) {
          MultiAI.switchProvider?.('gemini');
          setSelectedProvider('gemini');
        } else if (/analy[sz]e|trend|optimi[sz]e|strategy|budget|plan|calculate|math/.test(m)) {
          MultiAI.switchProvider?.('deepseek');
          setSelectedProvider('deepseek');
        } else if (/creative|tone|rewrite|summari[sz]e/.test(m)) {
          MultiAI.switchProvider?.('openai');
          setSelectedProvider('openai');
        }
      } catch {}

      const response = await MultiAI.sendMessage(
        message,
        messages.map(m => ({
          id: m.id,
          role: m.user ? 'user' : 'assistant',
          content: m.text,
          timestamp: m.timestamp,
          context: m.user ? undefined : context
        })),
        context,
        { agent }
      );

      // Add AI response to messages
      const aiMessage: Message = {
        id: Date.now().toString() + '_ai',
        text: response.message,
        user: false,
        timestamp: new Date(),
        type: response.actionRequired ? 'action' : 'insight',
        actions: response.suggestions ? response.suggestions.map((suggestion, index) => ({
          id: `suggestion_${index}`,
          label: suggestion,
          action: () => handleSuggestionClick(suggestion)
        })) : undefined
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Suggest Standard Bank products if relevant
      try {
        await StandardBank.ensureCatalog();
        const suggestions = StandardBank.suggestProducts({ message, context }, 3);
        if (suggestions.length > 0) {
          const suggestionText = suggestions
            .map((s, idx) => `• ${s.product.name} (${s.product.category})\n  Why: ${s.reason}\n  More: ${s.product.link}\n  Disclaimer: ${s.disclaimer}`)
            .join('\n\n');

          const suggestionMessage: Message = {
            id: Date.now().toString() + '_sb',
            text: `Based on your needs, you might consider these Standard Bank options:\n\n${suggestionText}`,
            user: false,
            timestamp: new Date(),
            type: 'suggestion',
            actions: suggestions.map((s, i) => ({
              id: `sb_${i}`,
              label: `Open ${s.product.name}`,
              action: () => {
                try { Linking.openURL(s.product.link); } catch {}
              }
            }))
          };
          setMessages(prev => [...prev, suggestionMessage]);
        }
      } catch (e) {
        // Silent fail on suggestions to avoid interrupting chat flow
      }
      
      // Speak response if autospeak is enabled
      if (voiceEnabled && autoSpeak) {
        try { await Voice.speakAIResponse(response.message, true); } catch {}
      }
      
      // Handle action requirements
      if (response.actionRequired) {
        handleActionRequired(response.actionRequired);
      }

    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        text: 'Sorry, I encountered an issue. Please try again.',
        user: false,
        timestamp: new Date(),
        type: 'warning'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load real user context for AI
  const loadChatContext = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const recentExpenses = await getExpensesByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      // Optionally, fetch goals and balance from backend if available
      setChatContext({
        recentExpenses,
        totalSpent: recentExpenses.reduce((sum, exp) => sum + exp.amount, 0),
        expenseCount: recentExpenses.length,
        lastUpdated: new Date(),
        // Add more real data as needed
      });
    } catch (error) {
      console.warn('Failed to load chat context:', error);
    }
  };

  // Initialize chat with welcome message
  useEffect(() => {
  // Preload Standard Bank catalog (cached)
  StandardBank.ensureCatalog().catch(() => {});
    // Load AI providers for switcher UI
    try {
      const details = MultiAI.getProviderDetails?.();
      if (Array.isArray(details)) {
        setAvailableProviders(details);
      }
      const currentKey = MultiAI.getCurrentProviderKey?.();
      if (currentKey) setSelectedProvider(currentKey);
    } catch {}

    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        text: `Hi! I'm BlueBot, your AI financial assistant. I'm here to help you manage your money better, understand your spending patterns, and achieve your financial goals. How can I help you today?`,
        user: false,
        timestamp: new Date(),
        type: 'insight',
      };
      setMessages([welcomeMessage]);
      loadChatContext();
    }
  }, [user]);

  const quickActions: QuickAction[] = [
    {
      id: '1',
      text: 'Analyze my spending',
      icon: <Icon name="trending-up" size={16} color="#1E3A8A" />,
      category: 'analysis',
    },
    {
      id: '2',
      text: 'Budget advice',
      icon: <Icon name="cash" size={16} color="#1E3A8A" />,
      category: 'advice',
    },
    {
      id: '3',
      text: 'Savings tips',
      icon: <Icon name="bulb" size={16} color="#1E3A8A" />,
      category: 'advice',
    },
    {
      id: '4',
      text: 'Explain banking terms',
      icon: <Icon name="alert-circle" size={16} color="#1E3A8A" />,
      category: 'education',
    },
    {
      id: '5',
      text: 'Scan receipt',
      icon: <Icon name="camera" size={16} color="#1E3A8A" />,
      category: 'receipt',
    },
    {
      id: '6',
      text: 'Set savings goal',
      icon: <Icon name="flag" size={16} color="#1E3A8A" />,
      category: 'goal',
    },
  ];

  const sendMessage = useCallback(async () => {
    if (inputText.trim() === '') return;

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      text: inputText.trim(),
      user: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText.trim();
    setInputText('');
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Use MultiAI service
      await sendMessageToAI(currentInput);
      
    } catch (error) {
      console.error('AI chat error:', error);
      
      // Fallback to local responses
      const fallbackResponse = getLocalResponse(currentInput);
      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        text: fallbackResponse,
        user: false,
        timestamp: new Date(),
        type: 'insight',
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [inputText, chatContext, messages, user]);

  const handleMessageAction = (action: any) => {
    switch (action.type) {
      case 'navigate':
        // Navigate to specific screen
        switch (action.target) {
          case 'wallet':
            router.push('/(tabs)/wallet');
            break;
          case 'profile':
            router.push('/(tabs)/profile');
            break;
          case 'learn':
            router.push('/(tabs)/learn');
            break;
          default:
            Alert.alert('Navigation', `Navigating to ${action.target}...`);
        }
        break;
      case 'create_goal':
        // Create a new savings goal
        showCreateGoalDialog();
        break;
      case 'scan_receipt':
        // Open receipt scanner
        showReceiptScanOptions();
        break;
      case 'view_expenses':
        // Show expense breakdown
        showExpenseBreakdown();
        break;
      case 'create_budget':
        // Help create a budget
        showBudgetHelper();
        break;
      case 'track_expense':
        // Add new expense
        showExpenseTracker();
        break;
      case 'learn_more':
        // Navigate to education
        router.push('/(tabs)/learn');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const showCreateGoalDialog = () => {
    if (Alert.prompt) {
      Alert.prompt(
        'Create Savings Goal',
        'What would you like to save for?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Goal', 
            onPress: (goalName) => {
              if (goalName && goalName.trim()) {
                showGoalAmountDialog(goalName.trim());
              }
            }
          }
        ],
        'plain-text',
        'Emergency Fund'
      );
    } else {
      Alert.alert(
        'Create Savings Goal',
        'Goal creation feature allows you to set and track financial targets.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Learn More', onPress: () => router.push('/(tabs)/learn') }
        ]
      );
    }
  };

  const showGoalAmountDialog = (goalName: string) => {
    if (Alert.prompt) {
      Alert.prompt(
        'Set Target Amount',
        `How much do you want to save for "${goalName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Set Goal', 
            onPress: (amount) => {
              const targetAmount = parseFloat(amount || '0');
              if (targetAmount > 0) {
                Alert.alert(
                  'Goal Created!',
                  `Your "${goalName}" goal of R${targetAmount.toFixed(2)} has been created. Start saving today!`,
                  [{ text: 'Great!' }]
                );
              } else {
                Alert.alert('Invalid Amount', 'Please enter a valid target amount');
              }
            }
          }
        ],
        'numeric',
        '1000'
      );
    }
  };

  const showReceiptScanOptions = () => {
    Alert.alert(
      'Receipt Scanner',
      'Automatically extract expense details from receipts:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Take Photo', 
          onPress: () => Alert.alert('Camera', 'Opening camera to scan receipt...')
        },
        { 
          text: 'Choose from Gallery', 
          onPress: () => Alert.alert('Gallery', 'Opening gallery to select receipt...')
        },
        {
          text: 'Manual Entry',
          onPress: () => showExpenseTracker()
        }
      ]
    );
  };

  const showExpenseBreakdown = () => {
    const recentExpenses = chatContext.recentExpenses || [];
    const totalSpent = recentExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
    const categorySums = recentExpenses.reduce((acc: Record<string, number>, exp: any) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const breakdown = Object.entries(categorySums)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([category, amount]) => `• ${category}: R${(amount as number).toFixed(2)}`)
      .join('\n');

    Alert.alert(
      'Expense Breakdown (Last 30 Days)',
      `Total Spent: R${totalSpent.toFixed(2)}\n\nTop Categories:\n${breakdown || 'No expenses recorded'}`,
      [
        { text: 'Close' },
        { text: 'View Full Report', onPress: () => Alert.alert('Report', 'Detailed expense report coming soon!') }
      ]
    );
  };

  const showBudgetHelper = () => {
    Alert.alert(
      'Budget Helper',
      'Let me help you create a realistic budget based on the 50/30/20 rule:\n\n50% - Needs (rent, groceries, utilities)\n30% - Wants (entertainment, dining out)\n20% - Savings and debt repayment',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Calculate My Budget', onPress: () => showIncomeDialog() },
        { text: 'Learn More', onPress: () => router.push('/(tabs)/learn') }
      ]
    );
  };

  const showIncomeDialog = () => {
    if (Alert.prompt) {
      Alert.prompt(
        'Monthly Income',
        'What is your monthly take-home income?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Calculate Budget', 
            onPress: (income) => {
              const monthlyIncome = parseFloat(income || '0');
              if (monthlyIncome > 0) {
                const needs = monthlyIncome * 0.5;
                const wants = monthlyIncome * 0.3;
                const savings = monthlyIncome * 0.2;
                
                Alert.alert(
                  'Your Recommended Budget',
                  `Monthly Income: R${monthlyIncome.toFixed(2)}\n\n` +
                  `Needs (50%): R${needs.toFixed(2)}\n` +
                  `Wants (30%): R${wants.toFixed(2)}\n` +
                  `Savings (20%): R${savings.toFixed(2)}`,
                  [
                    { text: 'Save Budget', onPress: () => Alert.alert('Saved', 'Budget saved to your profile!') },
                    { text: 'Adjust', onPress: () => Alert.alert('Customize', 'Budget customization coming soon!') },
                    { text: 'Done' }
                  ]
                );
              } else {
                Alert.alert('Invalid Income', 'Please enter a valid monthly income');
              }
            }
          }
        ],
        'numeric',
        '15000'
      );
    }
  };

  const showExpenseTracker = () => {
    if (Alert.prompt) {
      Alert.prompt(
        'Add Expense',
        'Enter expense description:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Next', 
            onPress: (description) => {
              if (description && description.trim()) {
                showExpenseAmountDialog(description.trim());
              }
            }
          }
        ],
        'plain-text',
        'Lunch at restaurant'
      );
    } else {
      Alert.alert(
        'Expense Tracker',
        'Track your daily expenses to better understand your spending patterns.',
        [
          { text: 'Close' },
          { text: 'Learn More', onPress: () => router.push('/(tabs)/learn') }
        ]
      );
    }
  };

  const showExpenseAmountDialog = (description: string) => {
    if (Alert.prompt) {
      Alert.prompt(
        'Expense Amount',
        `How much did you spend on "${description}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Expense', 
            onPress: (amount) => {
              const expenseAmount = parseFloat(amount || '0');
              if (expenseAmount > 0) {
                Alert.alert(
                  'Expense Added!',
                  `"${description}" - R${expenseAmount.toFixed(2)} has been added to your expenses.`,
                  [{ text: 'Great!' }]
                );
              } else {
                Alert.alert('Invalid Amount', 'Please enter a valid expense amount');
              }
            }
          }
        ],
        'numeric',
        '50'
      );
    }
  };

  const getLocalResponse = (message: string): string => {
    return "Sorry, this feature is not available offline. Please check your connection.";
  };

  const sendQuickAction = useCallback((actionText: string) => {
    setInputText(actionText);
    setTimeout(() => sendMessage(), 100);
  }, [sendMessage]);

  // Voice handlers
  const handleMicPress = async () => {
    if (!voiceEnabled) {
      try {
        await Voice.initialize();
        Voice.setEnabled(true);
        setVoiceEnabled(true);
      } catch (e) {
        Alert.alert('Voice', 'Failed to enable voice');
        return;
      }
    }

    // Tap-to-finish: if already listening, stop now
    if (listening) {
      try { await Voice.stopListening(); } catch {}
      setListening(false);
      return;
    }

    setListening(true);
    try {
      // Add max listening timeout (e.g., 15s)
      const transcript = await Voice.startListening(undefined, 15000);
      setListening(false);

      if (transcript) {
        setInputText(transcript);
        setTimeout(() => sendMessage(), 50);
      }
    } catch (err: any) {
      setListening(false);
      Alert.alert('Voice', typeof err === 'string' ? err : 'Could not capture speech.');
    }
  };

  const handleStopSpeaking = async () => {
    try { await Voice.stopSpeaking(); } catch {}
  };

  // Simple provider change handler
  const handleProviderChange = (key: string) => {
    try {
      const ok = MultiAI.switchProvider?.(key);
      if (ok) setSelectedProvider(key);
    } catch {
      setSelectedProvider(key);
    }
  };

  // Toggle auto-speak setting
  const handleToggleSpeak = () => {
    setAutoSpeak((v) => !v);
  };

  // Helper to render AI message icon by type
  const getMessageIcon = (type?: 'tip' | 'warning' | 'insight' | 'action' | 'suggestion') => {
    switch (type) {
      case 'tip':
        return <Icon name="bulb" size={16} color="#1E3A8A" />;
      case 'warning':
        return <Icon name="warning" size={16} color="#F59E0B" />;
      case 'action':
        return <Icon name="flash" size={16} color="#10B981" />;
      case 'suggestion':
        return <Icon name="sparkles" size={16} color="#6366F1" />;
      case 'insight':
      default:
        return <Icon name="chatbubble-ellipses" size={16} color="#1E3A8A" />;
    }
  };

  // Helper to format time stamps
  const formatTime = (date: Date) => {
    try {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Agent Switcher */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 8 }}>
        <Text style={{ fontWeight: 'bold', marginRight: 8 }}>Agent:</Text>
        {(
          [
            { key: 'blue', label: 'Blue', color: '#1E3A8A', icon: 'business' },
            { key: 'penny', label: 'Penny', color: '#10B981', icon: 'wallet' },
            { key: 'sable', label: 'Sable', color: '#6366F1', icon: 'trending-up' },
            { key: 'zuri', label: 'Zuri', color: '#F59E0B', icon: 'school' },
            { key: 'kora', label: 'Kora', color: '#EF4444', icon: 'logo-bitcoin' },
          ] as const
        ).map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setAgent(opt.key)}
            style={{
              backgroundColor: agent === opt.key ? opt.color : '#E5E7EB',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 16,
              marginRight: 6,
              borderWidth: agent === opt.key ? 0 : 1,
              borderColor: '#CBD5E1'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={opt.icon as any} size={12} color={agent === opt.key ? '#FFFFFF' : '#334155'} style={{ marginRight: 4 }} />
              <Text style={{ color: agent === opt.key ? '#FFFFFF' : '#1E293B', fontSize: 12, fontWeight: '600' }}>{opt.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {/* Provider Switcher */}
      <View style={{ flexDirection: 'row', alignItems: 'center', margin: 10 }}>
        <Text style={{ fontWeight: 'bold', marginRight: 8 }}>AI Provider:</Text>
        {availableProviders.map((prov) => (
          <TouchableOpacity
            key={prov.key}
            style={{
              backgroundColor: prov.key === selectedProvider ? '#10B981' : '#E5E7EB',
              padding: 6,
              borderRadius: 6,
              marginRight: 6,
              opacity: prov.available ? 1 : 0.5,
              borderWidth: prov.key === selectedProvider ? 0 : 1,
              borderColor: '#CBD5E1'
            }}
            disabled={!prov.available}
            onPress={() => handleProviderChange(prov.key)}
          >
            <Text style={{ color: prov.key === selectedProvider ? 'white' : '#1E293B', fontSize: 12, fontWeight: '600' }}>
              {prov.name}
            </Text>
            <Text style={{ color: prov.key === selectedProvider ? 'white' : '#475569', fontSize: 10 }}>
              {prov.model}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Voice controls */}
        <View style={{ flexDirection: 'row', marginLeft: 'auto', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleToggleSpeak}
            style={{
              backgroundColor: autoSpeak ? '#1E3A8A' : '#E5E7EB',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 16,
              marginRight: 8,
            }}
          >
            <Text style={{ color: autoSpeak ? 'white' : '#1E293B', fontSize: 12 }}>
              {autoSpeak ? 'Speak: On' : 'Speak: Off'}
            </Text>
          </TouchableOpacity>

          {/* Stop Speaking button */}
          <TouchableOpacity
            onPress={handleStopSpeaking}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#F59E0B',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 8,
            }}
            accessibilityLabel="Stop speaking"
          >
            <Ionicons name="stop" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleMicPress}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: listening ? '#EF4444' : '#1E3A8A',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 8,
            }}
          >
            <Ionicons name={listening ? 'mic' : 'mic-outline'} size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Header */}
      <KeyboardAvoidingView 
        style={[styles.keyboardContainer, { paddingBottom: insets.bottom + 90 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.botAvatar}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                {agent === 'blue' && 'Blue'}
                {agent === 'penny' && 'Penny'}
                {agent === 'sable' && 'Sable'}
                {agent === 'zuri' && 'Zuri'}
                {agent === 'kora' && 'Kora'}
              </Text>
              <Text style={styles.headerSubtitle}>AI Financial Assistant</Text>
              <Text style={styles.headerSubtitle}>
                {agent === 'blue' && 'Standard Bank specialist (products, fees, processes)'}
                {agent === 'penny' && 'Budgeting coach (spend control, envelopes, habits)'}
                {agent === 'sable' && 'Savings & investing guide (TFSA, ETFs, RA)'}
                {agent === 'zuri' && 'Financial educator (credit, interest, POPIA)'}
                {agent === 'kora' && 'Crypto & digital payments (SA-focused, safety-first)'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActions}
          >
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionButton}
                onPress={() => sendQuickAction(action.text)}
              >
                {action.icon}
                <Text style={styles.quickActionText}>{action.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.messagesList, { paddingBottom: (insets.bottom + 90) + 40 }]}
        >
          {messages.map((message) => (
            <View key={message.id}>
              <View
                style={[
                  styles.messageContainer,
                  message.user ? styles.userMessageContainer : styles.aiMessageContainer,
                ]}
              >
                {!message.user && (
                  <View style={styles.aiMessageHeader}>
                    <View style={styles.aiAvatar}>
                      {getMessageIcon(message.type)}
                    </View>
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    message.user ? styles.userMessageBubble : styles.aiMessageBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.user ? styles.userMessageText : styles.aiMessageText,
                    ]}
                  >
                    {message.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      message.user ? styles.userMessageTime : styles.aiMessageTime,
                    ]}
                  >
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
                {message.user && (
                  <View style={styles.userAvatar}>
                    <Icon name="person" size={16} color="#1E3A8A" />
                  </View>
                )}
              </View>
              
              {/* Message Actions */}
              {message.actions && message.actions.length > 0 && (
                <View style={styles.messageActionsContainer}>
                  {message.actions.map((action) => (
                    <TouchableOpacity
                      key={action.id}
                      style={styles.messageActionButton}
                      onPress={action.action}
                    >
                      <Text style={styles.messageActionText}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.aiAvatar}>
                <Icon name="chatbubble-ellipses" size={16} color="#1E3A8A" />
              </View>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>
                  {(agent === 'blue' && 'Blue') || (agent === 'penny' && 'Penny') || (agent === 'sable' && 'Sable') || (agent === 'zuri' && 'Zuri') || 'Kora'} is thinking...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              agent === 'blue'
                ? 'Ask Blue about Standard Bank products, accounts, cards...'
                : agent === 'penny'
                ? 'Ask Penny for budgeting help...'
                : agent === 'sable'
                ? 'Ask Sable about saving and investing (TFSA, ETFs)...'
                : agent === 'zuri'
                ? 'Ask Zuri to explain a financial concept...'
                : 'Ask Kora about crypto and digital payments...'
            }
            placeholderTextColor="#64748B"
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() ? styles.sendButtonActive : styles.sendButtonInactive,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Icon name="send" size={20} color={inputText.trim() ? "#FFFFFF" : "#64748B"} />
          </TouchableOpacity>
          {/* Mic on input bar for convenience */}
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: listening ? '#EF4444' : '#E5E7EB' }]}
            onPress={handleMicPress}
          >
            <Ionicons name={listening ? 'mic' : 'mic-outline'} size={20} color={listening ? '#FFFFFF' : '#1E293B'} />
          </TouchableOpacity>
          {/* Stop Speaking on input bar */}
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: '#F59E0B' }]}
            onPress={handleStopSpeaking}
          >
            <Ionicons name="stop" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
  backgroundColor: theme.colors.card,
  paddingHorizontal: theme.spacing.lg,
  paddingVertical: theme.spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  backgroundColor: theme.colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
  color: theme.colors.text,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
  color: theme.colors.muted,
    marginTop: 2,
  },
  quickActionsContainer: {
  backgroundColor: theme.colors.card,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: theme.colors.border,
  },
  quickActions: {
  paddingHorizontal: theme.spacing.lg,
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  backgroundColor: theme.colors.cardAlt,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickActionText: {
    fontSize: 14,
  color: theme.colors.text,
    fontWeight: '500',
    marginLeft: 6,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
  padding: theme.spacing.lg,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  aiMessageHeader: {
    marginRight: 8,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  backgroundColor: theme.colors.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  backgroundColor: theme.colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userMessageBubble: {
  backgroundColor: theme.colors.primaryDark,
  },
  aiMessageBubble: {
  backgroundColor: theme.colors.card,
  borderWidth: 1,
  borderColor: theme.colors.border,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
  color: theme.colors.text,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 6,
  },
  userMessageTime: {
    color: '#FFFFFF',
    opacity: 0.7,
  },
  aiMessageTime: {
  color: theme.colors.muted,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  typingBubble: {
  backgroundColor: theme.colors.cardAlt,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 8,
  },
  typingText: {
    fontSize: 14,
  color: theme.colors.muted,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  paddingHorizontal: theme.spacing.lg,
  paddingVertical: theme.spacing.md,
  backgroundColor: theme.colors.card,
  borderTopWidth: 1,
  borderTopColor: theme.colors.border,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
  borderColor: theme.colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  color: theme.colors.text,
    maxHeight: 100,
  backgroundColor: theme.colors.cardAlt,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonActive: {
  backgroundColor: theme.colors.primaryDark,
  },
  sendButtonInactive: {
  backgroundColor: theme.colors.border,
  },
  messageActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  paddingHorizontal: theme.spacing.lg,
    paddingBottom: 8,
    gap: 8,
  },
  messageActionButton: {
  backgroundColor: theme.colors.cardAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  borderColor: theme.colors.border,
  },
  messageActionText: {
    fontSize: 13,
  color: theme.colors.text,
    fontWeight: '500',
  },
});
