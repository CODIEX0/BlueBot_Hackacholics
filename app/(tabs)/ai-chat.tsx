import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Modal,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { useRouter } from 'expo-router';
import MultiAI from '../../services/MultiAI';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { standardBankService } from '../../services/StandardBankService';
import { DEFAULT_TOTAL_BALANCE } from '@/config/app';
import { useAccountsIntegration } from '@/contexts/AccountIntegrationContext';
import { wellbeingScoreService, WellbeingScoreResult } from '@/services/WellbeingScoreService';
import { useBudgetPlan } from '@/contexts/BudgetPlanContext';
import { financialNarrativeService } from '@/services/FinancialNarrativeService';
import { useBalance } from '@/contexts/BalanceContext';
import { useAWS } from '../../contexts/AWSContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import Voice from '@react-native-community/voice';

const { useState, useEffect, useCallback, useRef, useMemo } = React;

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
  type?: 'normal' | 'suggestion' | 'action' | 'insight' | 'warning' | 'tip' | 'system';
  agent?: string;
  actions?: Array<{
    id: string;
    label: string;
    action: () => void;
  }>;
}

interface Agent {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  specialty: string;
}

export default function AIChatScreen() {
  const { currentBalance } = useBalance();
  const accountsFeed = useAccountsIntegration();
  const { plan: budgetPlan } = useBudgetPlan();
  const [wellbeing, setWellbeing] = useState<WellbeingScoreResult|null>(null);
  const [narrativeHighlights, setNarrativeHighlights] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [selectedAgent, setSelectedAgent] = useState<Agent>({
    id: 'bluebot',
    name: 'BlueBot',
    icon: 'chatbubble-ellipses',
    description: 'Your comprehensive financial assistant',
    color: theme.colors.primary,
    specialty: 'General Financial Advice'
  });
  
  // Voice-related state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechResult, setSpeechResult] = useState('');
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  // Settings state
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  type VoicePreset = 'Balanced' | 'Warm' | 'Calm' | 'Narrator' | 'Energetic';
  const [voicePreset, setVoicePreset] = useState<VoicePreset>('Balanced');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [dataSharingConsent, setDataSharingConsent] = useState<boolean>(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { userData, currentUser } = useAWS();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Available AI agents
  const agents: Agent[] = [
    {
      id: 'bluebot',
      name: 'BlueBot',
      icon: 'chatbubble-ellipses',
      description: 'Your comprehensive financial assistant',
      color: theme.colors.primary,
      specialty: 'General Financial Advice'
    },
    {
      id: 'pepper',
      name: 'Pepper',
      icon: 'business',
      description: 'Standard Bank specialist for products and services',
      color: theme.colors.success,
      specialty: 'Banking Products & Services'
    },
    {
      id: 'penny',
      name: 'Penny',
      icon: 'wallet',
      description: 'Budgeting and expense management coach',
      color: theme.colors.warning,
      specialty: 'Budget Management'
    },
    {
      id: 'sable',
      name: 'Sable',
      icon: 'trending-up',
      description: 'Savings and investment advisor',
      color: theme.gradients.purple[1],
      specialty: 'Savings & Investments'
    },
    {
      id: 'zuri',
      name: 'Zuri',
      icon: 'school',
      description: 'Financial education specialist',
      color: theme.colors.danger,
      specialty: 'Financial Education'
    },
    {
      id: 'kora',
      name: 'Kora',
      icon: 'shield-checkmark',
      description: 'Crypto and digital payments safety guide',
      color: theme.colors.accent,
      specialty: 'Crypto & Digital Payments'
    },
    {
      id: 'nova',
      name: 'Nova',
      icon: 'flash',
      description: 'Investing & income growth specialist',
      color: theme.colors.warning,
      specialty: 'Income & Investing'
    }
  ];

  // Demo chat context
  const [chatContext] = useState({
    recentExpenses: [
      { amount: 45.50, category: 'Food', merchant: 'Woolworths', date: new Date() },
      { amount: 120.00, category: 'Transport', merchant: 'Uber', date: new Date() },
      { amount: 850.00, category: 'Housing', merchant: 'Rent Payment', date: new Date() },
    ],
  currentBalance: DEFAULT_TOTAL_BALANCE,
    monthlyBudget: 25000.00,
    savingsGoals: [
      { name: 'Emergency Fund', target: 50000, current: 15000 },
      { name: 'Vacation', target: 25000, current: 8500 }
    ]
  });

  // Voice control functions
  const startListening = useCallback(async () => {
    if (!voiceAvailable) {
      Alert.alert('Voice Not Available', 'Voice recognition is not available on this device.');
      return;
    }

    try {
      setIsListening(true);
      setSpeechResult('');
      if (typeof (Voice as any)?.start === 'function') {
        await (Voice as any).start(selectedLanguage || 'en-US');
      }
      console.log('Started listening...');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
      Alert.alert('Voice Error', 'Could not start voice recognition. Please try again.');
    }
  }, [voiceAvailable]);

  const stopListening = useCallback(async () => {
    try {
      if (typeof (Voice as any)?.stop === 'function') {
        await (Voice as any).stop();
      }
      setIsListening(false);
      console.log('Stopped listening');
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      setIsListening(false);
    }
  }, []);

  const selectedVoice = useMemo(() => {
    return availableVoices.find(v => (v.identifier || v.name) === selectedVoiceId);
  }, [availableVoices, selectedVoiceId]);

  const southAfricanLanguages = useMemo(() => ([
    { code: 'en-ZA', name: 'English (South Africa)' },
    { code: 'af-ZA', name: 'Afrikaans' },
    { code: 'zu-ZA', name: 'isiZulu' },
    { code: 'xh-ZA', name: 'isiXhosa' },
    { code: 'st-ZA', name: 'Sesotho' },
    { code: 'nso-ZA', name: 'Sepedi (Northern Sotho)' },
    { code: 'tn-ZA', name: 'Setswana' },
    { code: 'ts-ZA', name: 'Xitsonga' },
    { code: 'ss-ZA', name: 'siSwati' },
    { code: 've-ZA', name: 'Tshivenda' },
    { code: 'nr-ZA', name: 'isiNdebele' },
  ]), []);

  const filteredVoices = useMemo(() => {
    if (!selectedLanguage) return availableVoices;
    const target = selectedLanguage.toLowerCase();
    return availableVoices.filter(v => (v.language || '').toLowerCase().startsWith(target));
  }, [availableVoices, selectedLanguage]);

  const startSpeaking = useCallback(async (text: string) => {
    if (!voiceEnabled) return;

    try {
      setIsSpeaking(true);
      setIsPaused(false);
      // Map voice preset to pitch/rate for more natural TTS
      const presetParams: Record<VoicePreset, { rate: number; pitch: number }> = {
        Balanced: { rate: 0.9, pitch: 1.0 },
        Warm: { rate: 0.88, pitch: 1.05 },
        Calm: { rate: 0.85, pitch: 0.95 },
        Narrator: { rate: 0.78, pitch: 1.0 },
        Energetic: { rate: 0.98, pitch: 1.05 },
      };
      const params = presetParams[voicePreset] ?? presetParams.Balanced;
      await Speech.speak(text, {
        language: selectedLanguage || (selectedVoice as any)?.language || 'en-US',
        pitch: params.pitch,
        rate: params.rate,
        ...(selectedVoiceId ? ({ voice: selectedVoiceId } as any) : {}),
        onDone: () => {
          setIsSpeaking(false);
          setIsPaused(false);
          console.log('Finished speaking');
        },
        onStopped: () => {
          setIsSpeaking(false);
          setIsPaused(false);
          console.log('Speech stopped');
        },
        onError: (error) => {
          setIsSpeaking(false);
          setIsPaused(false);
          console.warn('Speech error:', error);
        }
      });
    } catch (error) {
      console.error('Error starting speech:', error);
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [voiceEnabled, selectedVoiceId, voicePreset, selectedVoice, selectedLanguage]);

  const stopSpeaking = useCallback(async () => {
    try {
      await Speech.stop();
      setIsSpeaking(false);
      setIsPaused(false);
      console.log('Speech stopped manually');
    } catch (error) {
      console.error('Error stopping speech:', error);
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, []);

  const pauseSpeaking = useCallback(async () => {
    try {
      await (Speech as any).pause?.();
      setIsPaused(true);
      // Keep isSpeaking true to indicate an active session
    } catch (error) {
      console.warn('Error pausing speech:', error);
    }
  }, []);

  const resumeSpeaking = useCallback(async () => {
    try {
      await (Speech as any).resume?.();
      setIsPaused(false);
      setIsSpeaking(true);
    } catch (error) {
      console.warn('Error resuming speech:', error);
    }
  }, []);

  // Initialize fade animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  // Initialize voice recognition
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const voices = await (Speech as any).getAvailableVoicesAsync?.();
        if (Array.isArray(voices)) {
          setAvailableVoices(voices);
        } else {
          setAvailableVoices([]);
        }
      } catch {
        setAvailableVoices([]);
      }
    };

    const initializeVoice = async () => {
      try {
        const available = typeof (Voice as any)?.isAvailable === 'function' ? await (Voice as any).isAvailable() : false;
        setVoiceAvailable(!!available);

        // Set up voice event listeners (only if properties exist)
        if (Voice && typeof Voice === 'object') {
          try { (Voice as any).onSpeechResults = onSpeechResults; } catch {}
          try { (Voice as any).onSpeechError = onSpeechError; } catch {}
          try { (Voice as any).onSpeechEnd = onSpeechEnd; } catch {}
        }
        // Fetch available voices for TTS
        await loadVoices();
        
        console.log('Voice recognition initialized');
      } catch (error) {
        console.warn('Voice recognition not available:', error);
        setVoiceAvailable(false);
      }
    };

    initializeVoice();

    // Refresh voices when returning to foreground (after installing new voices in settings)
    let sub: any = null;
    try {
      const AppStateModule = (require('react-native') as any).AppState;
      if (AppStateModule?.addEventListener) {
        sub = AppStateModule.addEventListener('change', (state: any) => {
          if (state === 'active') {
            loadVoices();
          }
        });
      }
    } catch {}

    // Cleanup voice listeners on unmount
    return () => {
      try { (Voice as any)?.removeAllListeners?.(); } catch {}
      stopListening();
      stopSpeaking();
  try { sub?.remove?.(); } catch {}
    };
  }, []);

  // Voice event handlers
  const onSpeechResults = (e: { value?: string[] }) => {
    if (e.value && e.value.length > 0) {
      const spokenText = e.value[0];
      setSpeechResult(spokenText);
      setInputText(spokenText);
      console.log('Speech result:', spokenText);
    }
  };

  const onSpeechError = (e: any) => {
    console.warn('Speech recognition error:', e);
    setIsListening(false);
    Alert.alert('Voice Error', 'Could not understand speech. Please try again.');
  };

  const onSpeechEnd = () => {
    setIsListening(false);
    console.log('Speech recognition ended');
  };

  // Play a specific AI message via TTS
  const handlePlayMessage = useCallback(async (text: string) => {
    try {
      // Stop any current speech before replaying
      if (isSpeaking) {
        await stopSpeaking();
      }
      await startSpeaking(text);
    } catch (error) {
      console.warn('Play message failed:', error);
    }
  }, [isSpeaking, startSpeaking, stopSpeaking]);

  // Restore persisted settings
  useEffect(() => {
    (async () => {
      try {
        const savedProvider = await AsyncStorage.getItem('ai.selectedProvider');
        const savedAgent = await AsyncStorage.getItem('ai.selectedAgent');
  const savedVoice = await AsyncStorage.getItem('ai.voice');
  const savedTemp = await AsyncStorage.getItem('ai.temperature');
  const savedConsent = await AsyncStorage.getItem('ai.dataSharingConsent');
  const savedPreset = await AsyncStorage.getItem('ai.voicePreset');
        
        if (savedProvider) {
          setSelectedProvider(savedProvider);
        }
        
        if (savedAgent) {
          const agent = agents.find(a => a.id === savedAgent);
          if (agent) {
            setSelectedAgent(agent);
          }
        }
  if (savedVoice) setSelectedVoiceId(savedVoice);
        if (savedPreset && ['Balanced','Warm','Calm','Narrator','Energetic'].includes(savedPreset)) setVoicePreset(savedPreset as VoicePreset);
  const savedLang = await AsyncStorage.getItem('ai.language');
  if (savedLang) setSelectedLanguage(savedLang || null);
        if (savedTemp) {
          const t = parseFloat(savedTemp);
          if (!Number.isNaN(t)) setTemperature(Math.max(0, Math.min(1, t)));
        }
        if (savedConsent != null) setDataSharingConsent(savedConsent === 'true');
      } catch (error) {
        console.log('Failed to load saved settings:', error);
      }
    })();
  }, []);

  // Persist settings
  useEffect(() => { AsyncStorage.setItem('ai.voice', selectedVoiceId ?? ''); }, [selectedVoiceId]);
  useEffect(() => { AsyncStorage.setItem('ai.temperature', String(temperature)); }, [temperature]);
  useEffect(() => { AsyncStorage.setItem('ai.dataSharingConsent', String(dataSharingConsent)); }, [dataSharingConsent]);
  useEffect(() => { AsyncStorage.setItem('ai.voicePreset', voicePreset); }, [voicePreset]);
  useEffect(() => { AsyncStorage.setItem('ai.language', selectedLanguage ?? ''); }, [selectedLanguage]);

  // Auto-select a more natural-sounding English voice if none selected or invalid
  const pickBestVoice = useCallback((voices: any[]) => {
    const score = (v: any) => {
      let s = 0;
      const lang = (v.language || '').toLowerCase();
      const name = ((v.name || v.identifier || '') as string).toLowerCase();
      if (selectedLanguage && lang.startsWith(selectedLanguage.toLowerCase())) s += 6;
      if (['en-za','af-za','zu-za','xh-za','st-za','nso-za','tn-za','ts-za','ss-za','ve-za','nr-za'].some(p => lang.startsWith(p))) s += 4;
      if (!selectedLanguage) {
        if (lang.startsWith('en-us')) s += 4; else if (lang.startsWith('en-gb')) s += 3; else if (lang.startsWith('en')) s += 2;
      }
      if ((v.quality || '').toString().toLowerCase().includes('enhanced')) s += 3;
      if ((v.requiresNetwork ?? false) === true) s += 1;
      if (name.includes('neural') || name.includes('natural')) s += 5;
      if (name.includes('premium')) s += 2;
      // prefer not explicitly "default" or "local"
      if (name.includes('default')) s -= 2;
      if (name.includes('local')) s -= 1;
      return s;
    };
    const sorted = [...voices].sort((a, b) => score(b) - score(a));
    const best = sorted[0];
    return best ? (best.identifier || best.name) : null;
  }, [selectedLanguage]);

  useEffect(() => {
    if (availableVoices.length === 0) return;
    const base = selectedLanguage ? availableVoices.filter(v => (v.language || '').toLowerCase().startsWith(selectedLanguage.toLowerCase())) : availableVoices;
    const ids = new Set(base.map(v => v.identifier || v.name));
    if (!selectedVoiceId || !ids.has(selectedVoiceId)) {
      const best = pickBestVoice(base);
      if (best) setSelectedVoiceId(best);
    }
  }, [availableVoices, selectedLanguage]);

  // Keys for persisted snapshot
  const WELLBEING_KEY = 'ai.snapshot.wellbeing.v1';
  const HIGHLIGHTS_KEY = 'ai.snapshot.highlights.v1';
  const isTest = process.env.NODE_ENV === 'test';

  // Load persisted wellbeing & highlights early for instant UI
  useEffect(() => {
    if (isTest) return; // keep tests deterministic
    (async () => {
      try {
        const [wRaw, hRaw] = await Promise.all([
          AsyncStorage.getItem(WELLBEING_KEY),
          AsyncStorage.getItem(HIGHLIGHTS_KEY)
        ]);
        if (wRaw) {
          const parsed = JSON.parse(wRaw);
            if (parsed && parsed.version === 1 && parsed.data) {
              setWellbeing(parsed.data as WellbeingScoreResult);
            }
        }
        if (hRaw) {
          const parsedH = JSON.parse(hRaw);
          if (parsedH && Array.isArray(parsedH.highlights)) {
            setNarrativeHighlights(parsedH.highlights as string[]);
          }
        }
      } catch { /* silent */ }
    })();
  }, []);

  // Compute wellbeing + narrative snapshot when feed or plan changes
  useEffect(()=>{
    (async () => {
      try {
        const expenses = accountsFeed.expenseLike.map(e=>({ amount: e.amount, category: e.category, date: e.date, isRecurring: e.isRecurring }));
        const result = wellbeingScoreService.compute(expenses, [], currentBalance);
        setWellbeing(result);
        const recentSpend = expenses.slice(0,25).reduce((s,e)=>s+e.amount,0);
        const narrative = financialNarrativeService.generate({ wellbeing: result, budget: budgetPlan, currentBalance, recentSpend });
        setNarrativeHighlights(narrative.highlights);
        if (!isTest) {
          try {
            await AsyncStorage.setItem(WELLBEING_KEY, JSON.stringify({ version: 1, data: result }));
            await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify({ version: 1, highlights: narrative.highlights }));
          } catch { /* silent */ }
        }
      } catch { /* silent */ }
    })();
  }, [accountsFeed.expenseLike, budgetPlan, currentBalance]);

  // Initialize chat with personalized welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const userName = userData?.firstName || currentUser?.firstName || 'there';
      const welcomeMessage: Message = {
        id: '1',
        text: `Hi ${userName}! I'm ${selectedAgent.name}, your ${selectedAgent.specialty.toLowerCase()} assistant. ${selectedAgent.description}.\n\nI can help you with:\n\n• Budget tracking and expense analysis\n• Standard Bank products and services\n• Financial planning and goal setting\n• Receipt scanning and categorization\n• Investment and savings advice\n• Financial education and tips\n\nWhat would you like to know about your finances today?`,
        user: false,
        timestamp: new Date(),
        type: 'system',
        agent: selectedAgent.id,
      };
      setMessages([welcomeMessage]);
    }
  }, [selectedAgent]);

  const sendMessage = useCallback(async () => {
    if (inputText.trim() === '') return;

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      text: inputText.trim(),
      user: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Stop any ongoing speech
    if (isSpeaking) {
      await stopSpeaking();
    }

    try {
      const message = userMessage.text;
      
      // Enhanced context with user data
      const context = {
        userBalance: currentBalance ?? chatContext.currentBalance,
        monthlyBudget: chatContext.monthlyBudget,
        recentExpenses: chatContext.recentExpenses,
        savingsGoals: chatContext.savingsGoals,
        agent: selectedAgent.id,
        specialty: selectedAgent.specialty,
        userName: userData?.firstName || currentUser?.firstName || 'User',
        isDemo: !currentUser,
        wellbeingScore: wellbeing?.score,
        wellbeingGrade: wellbeing?.grade,
        wellbeingTopFactor: wellbeing ? [...wellbeing.breakdown].sort((a,b)=>b.normalized-a.normalized)[0]?.label : undefined,
        wellbeingWeakFactor: wellbeing ? [...wellbeing.breakdown].sort((a,b)=>a.normalized-b.normalized)[0]?.label : undefined,
        budgetPlan: budgetPlan ? {
          totalSuggested: budgetPlan.totalSuggested,
          categories: budgetPlan.recommendations.slice(0,10).map(r=>({ category: r.category, suggested: r.suggested }))
        } : null,
        narrativeHighlights,
      };

      // Hint provider selection based on agent and message
      try {
        MultiAI.preselectProvider?.(selectedAgent.id as any, message);
      } catch {}

      // Get AI response
      const response = await MultiAI.sendMessage(
        message, 
        [], // conversation history - we could maintain this in state
        { 
          ...context,
          ...(dataSharingConsent ? {} : { userName: undefined }),
          dataSharingConsent,
        } as any,
        { agent: (['pepper','penny','sable','zuri','kora','nova'] as string[]).includes(selectedAgent.id) ? (selectedAgent.id as any) : undefined, temperature }
      );
      
      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        text: response.message,
        user: false,
        timestamp: new Date(),
        type: 'normal',
        agent: selectedAgent.id,
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Start speaking the AI response
      if (voiceEnabled && response.message) {
        setTimeout(() => {
          startSpeaking(response.message);
        }, 500); // Small delay to ensure message is displayed first
      }
      
      // Add Standard Bank product suggestions for relevant queries
      if (selectedAgent.id === 'pepper' || message.toLowerCase().includes('bank') || message.toLowerCase().includes('product')) {
        try {
          const customer = standardBankService.getDemoCustomer();
          const suggestions = standardBankService.getProductRecommendations(customer);
          
          if (suggestions.length > 0) {
            const suggestionText = suggestions.slice(0, 2)
              .map((s) => `• **${s.name}** (${s.type})\n  ${s.description}\n  Key features: ${s.features.slice(0, 2).join(', ')}`)
              .join('\n\n');

            const suggestionMessage: Message = {
              id: Date.now().toString() + '_sb',
              text: `Based on your profile, here are some Standard Bank products that might interest you:\n\n${suggestionText}\n\n💡 Would you like to know more about any of these products?`,
              user: false,
              timestamp: new Date(),
              type: 'suggestion',
              agent: 'pepper',
            };
            
            // Delay suggestion message slightly
            setTimeout(() => {
              setMessages(prev => [...prev, suggestionMessage]);
            }, 1500);
          }
        } catch (e) {
          console.log('Failed to get product suggestions:', e);
        }
      }

      // Add financial insights for budget-related queries
      if (selectedAgent.id === 'penny' || message.toLowerCase().includes('budget') || message.toLowerCase().includes('spend')) {
        const insights = standardBankService.generateFinancialInsights(chatContext.recentExpenses);
        if (insights.length > 0) {
          const insightMessage: Message = {
            id: Date.now().toString() + '_insight',
            text: `📊 **Financial Insight**: ${insights[0]}`,
            user: false,
            timestamp: new Date(),
            type: 'insight',
            agent: 'penny',
          };
          
          setTimeout(() => {
            setMessages(prev => [...prev, insightMessage]);
          }, 2000);
        }
      }

    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        text: 'Sorry, I encountered an issue processing your request. Please try again, or switch to a different AI provider in settings.',
        user: false,
        timestamp: new Date(),
        type: 'warning',
        agent: selectedAgent.id,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, selectedAgent, selectedProvider, chatContext, userData, currentUser, isSpeaking, stopSpeaking, voiceEnabled, startSpeaking, temperature, dataSharingConsent]);

  // Quick action handlers
  const handleQuickAction = useCallback((actionText: string) => {
    setInputText(actionText);
    setTimeout(() => sendMessage(), 100);
  }, [sendMessage]);

  // Agent selection handler
  const handleAgentChange = useCallback(async (agent: Agent) => {
    setSelectedAgent(agent);
    try {
      await AsyncStorage.setItem('ai.selectedAgent', agent.id);
    } catch (error) {
      console.log('Failed to save agent selection:', error);
    }
    
    // Add system message about agent change
    const systemMessage: Message = {
      id: Date.now().toString() + '-system',
      text: `Switched to ${agent.name} - ${agent.description}. How can I help you with ${agent.specialty.toLowerCase()}?`,
      user: false,
      timestamp: new Date(),
      type: 'system',
      agent: agent.id,
    };
    setMessages(prev => [...prev, systemMessage]);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const renderMessage = (message: Message, index: number) => (
    <Animated.View 
      key={message.id} 
      style={[
        styles.messageContainer,
        message.user ? styles.userMessage : styles.aiMessage,
        { opacity: fadeAnim }
      ]}
    >
      {!message.user && (
        <View style={styles.aiHeader}>
          <LinearGradient
            colors={[selectedAgent.color, selectedAgent.color + '80']}
            style={styles.botAvatar}
          >
            <Icon name={selectedAgent.icon} size={20} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{selectedAgent.name}</Text>
            <Text style={styles.agentSpecialty}>{selectedAgent.specialty}</Text>
          </View>
        </View>
      )}
      <View style={[
        styles.messageBubble,
        message.user ? styles.userBubble : styles.aiBubble,
        message.type === 'suggestion' && styles.suggestionBubble,
        message.type === 'insight' && styles.insightBubble,
        message.type === 'warning' && styles.warningBubble,
        message.type === 'system' && styles.systemBubble,
      ]}>
        <Text style={[
          styles.messageText,
          message.user ? styles.userText : styles.aiText,
          message.type === 'system' && styles.systemText,
        ]}>
          {message.text}
        </Text>
        <View style={styles.bubbleMeta}>
          <Text style={[ 
            styles.timestamp,
            message.user ? styles.userTimestamp : styles.aiTimestamp
          ]}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {!message.user && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Play message"
              onPress={() => handlePlayMessage(message.text)}
              disabled={!voiceEnabled}
              style={[styles.playBtn, !voiceEnabled && styles.playBtnDisabled]}
            >
              <Icon 
                name="play-circle" 
                size={18} 
                color={voiceEnabled ? theme.colors.primary : theme.colors.muted} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );

  const quickActions = [
    { label: 'Check my budget', action: () => handleQuickAction('How is my budget looking this month?'), icon: 'wallet' },
    { label: 'Add expense', action: () => router.push('/add-expense'), icon: 'add-circle' },
    { label: 'Scan receipt', action: () => router.push('/scan-receipt'), icon: 'camera' },
    { label: 'Financial goals', action: () => handleQuickAction('Help me review my financial goals'), icon: 'trophy' },
    { label: 'Save money tips', action: () => handleQuickAction('Give me tips to save money'), icon: 'bulb' },
    { label: 'Standard Bank products', action: () => handleQuickAction('What Standard Bank products would you recommend for me?'), icon: 'business' },
  ];

  // Inline collapsible snapshot component
  const ContextSnapshot: React.FC<{ wellbeing: WellbeingScoreResult|null; budgetPlan: any; highlights: string[]; onRefresh: ()=>void }> = ({ wellbeing, budgetPlan, highlights, onRefresh }) => {
    const [open, setOpen] = useState(true);
    const savingsShare = (()=>{
      if (!budgetPlan) return undefined; const total = budgetPlan.recommendations.reduce((s:any,r:any)=>s+r.suggested,0)||0; const sav = budgetPlan.recommendations.find((r:any)=>/saving/i.test(r.category)); return total? ((sav?.suggested||0)/total*100).toFixed(1):undefined;
    })();
    return (
      <View style={{ paddingHorizontal:12, paddingVertical: open?12:6, backgroundColor: theme.colors.card, borderBottomWidth:1, borderColor: theme.colors.border }}>
        <TouchableOpacity onPress={()=>setOpen(o=>!o)} style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <Text style={{ color: theme.colors.text, fontWeight:'600', fontSize:14 }}>Financial Context</Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <TouchableOpacity onPress={onRefresh} style={{ paddingHorizontal:10, paddingVertical:4, backgroundColor: theme.colors.primaryDark, borderRadius:14 }}>
              <Text style={{ color: theme.colors.text, fontSize:11 }}>Refresh</Text>
            </TouchableOpacity>
            <Ionicons name={open? 'chevron-up':'chevron-down'} size={18} color={theme.colors.text} />
          </View>
        </TouchableOpacity>
        {open && (
          <View style={{ marginTop:8 }}>
            {wellbeing && (
              <Text style={{ color: theme.colors.muted, fontSize:12, marginBottom:4 }}>Wellbeing: {wellbeing.score.toFixed(0)} ({wellbeing.grade}) · Top {([...wellbeing.breakdown].sort((a,b)=>b.normalized-a.normalized)[0]?.label)||'-'} · Improve {([...wellbeing.breakdown].sort((a,b)=>a.normalized-b.normalized)[0]?.label)||'-'}</Text>
            )}
            {budgetPlan && (
              <Text style={{ color: theme.colors.muted, fontSize:12, marginBottom:4 }}>Budget Plan: {budgetPlan.recommendations.length} cats, total R{budgetPlan.totalSuggested} {savingsShare? `· Savings ${savingsShare}%`:''}</Text>
            )}
            {highlights.length>0 && (
              <Text style={{ color: theme.colors.muted, fontSize:11 }} numberOfLines={3}>Highlights: {highlights.slice(0,3).join(' | ')}</Text>
            )}
            {!wellbeing && !budgetPlan && highlights.length===0 && (
              <Text style={{ color: theme.colors.muted, fontSize:12 }}>Context will appear once data loads.</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Enhanced Header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <LinearGradient
              colors={[selectedAgent.color, selectedAgent.color + '80']}
              style={styles.headerAvatar}
            >
              <Icon name={selectedAgent.icon} size={24} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{selectedAgent.name}</Text>
              <Text style={styles.headerSubtitle}>{selectedAgent.specialty}</Text>
            </View>
            <View style={styles.headerControls}>
              <TouchableOpacity 
                style={[styles.controlButton, !voiceEnabled && styles.controlButtonDisabled]}
                onPress={() => setVoiceEnabled(!voiceEnabled)}
              >
                <Icon 
                  name={voiceEnabled ? "volume-high" : "volume-mute"} 
                  size={20} 
                  color={voiceEnabled ? theme.colors.text : theme.colors.muted} 
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsVisible(true)}>
                <Icon name="settings" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Agent Selector */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.agentSelector}
            contentContainerStyle={styles.agentSelectorContent}
          >
            {agents.map((agent) => (
              <TouchableOpacity
                key={agent.id}
                style={[
                  styles.agentChip,
                  selectedAgent.id === agent.id && styles.agentChipSelected
                ]}
                onPress={() => handleAgentChange(agent)}
              >
                  <Icon 
                    name={agent.icon} 
                    size={16} 
                    color={selectedAgent.id === agent.id ? theme.colors.text : agent.color} 
                  />
                <Text style={[
                  styles.agentChipText,
                  selectedAgent.id === agent.id && styles.agentChipTextSelected
                ]}>
                  {agent.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick Actions (Top, small chips) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickActionsBar}
            contentContainerStyle={styles.quickActionsContent}
          >
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionChip}
                onPress={action.action}
              >
                <Icon name={action.icon} size={14} color={theme.colors.text} />
                <Text style={styles.quickActionChipText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>

        {/* Context Snapshot Banner */}
        <ContextSnapshot
          wellbeing={wellbeing}
          budgetPlan={budgetPlan}
          highlights={narrativeHighlights}
          onRefresh={()=>{
            // Force recompute by re-running effect logic quickly
            (async () => {
              try {
                const expenses = accountsFeed.expenseLike.map(e=>({ amount: e.amount, category: e.category, date: e.date, isRecurring: e.isRecurring }));
                const result = wellbeingScoreService.compute(expenses, [], currentBalance);
                setWellbeing(result);
                const recentSpend = expenses.slice(0,25).reduce((s,e)=>s+e.amount,0);
                const narrative = financialNarrativeService.generate({ wellbeing: result, budget: budgetPlan, currentBalance, recentSpend });
                setNarrativeHighlights(narrative.highlights);
                if (!isTest) {
                  try {
                    await AsyncStorage.setItem(WELLBEING_KEY, JSON.stringify({ version: 1, data: result }));
                    await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify({ version: 1, highlights: narrative.highlights }));
                  } catch {}
                }
              } catch {}
            })();
          }}
        />

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          
          {isLoading && (
            <View style={[styles.messageContainer, styles.aiMessage]}>
              <View style={styles.aiHeader}>
                <LinearGradient
                  colors={[selectedAgent.color, selectedAgent.color + '80']}
                  style={styles.botAvatar}
                >
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.agentInfo}>
                  <Text style={styles.agentName}>{selectedAgent.name}</Text>
                  <Text style={styles.agentSpecialty}>Thinking...</Text>
                </View>
              </View>
              <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                <View style={styles.typingIndicator}>
                  <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
                  <View style={[styles.typingDot, { animationDelay: '200ms' }]} />
                  <View style={[styles.typingDot, { animationDelay: '400ms' }]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

  {/* Quick Actions moved to the top as chips */}

        {/* Enhanced Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={`Ask ${selectedAgent.name} anything...`}
              placeholderTextColor={theme.colors.muted}
              multiline
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              editable={!isLoading && !isListening}
            />
            
            {/* Voice Control Button */}
            {voiceAvailable && (
              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  isListening && styles.voiceButtonActive,
                  (!voiceAvailable || isLoading) && styles.voiceButtonDisabled
                ]}
                onPress={isListening ? stopListening : startListening}
                disabled={!voiceAvailable || isLoading}
              >
                <LinearGradient
                  colors={isListening ? [theme.colors.danger, theme.colors.danger] : [theme.colors.accent, theme.colors.primary]}
                  style={styles.voiceButtonGradient}
                >
                  <Icon 
                    name={isListening ? "mic" : "mic-outline"} 
                    size={20} 
                    color="#FFFFFF" 
                  />
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            {/* Speech Output Control */}
            {isSpeaking && (
              <>
                <TouchableOpacity
                  style={styles.pauseButton}
                  onPress={isPaused ? resumeSpeaking : pauseSpeaking}
                >
                  <LinearGradient
                    colors={[theme.colors.accent, theme.colors.primary]}
                    style={styles.pauseButtonGradient}
                  >
                    <Icon name={isPaused ? 'play' : 'pause'} size={20} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.speakingButton}
                  onPress={stopSpeaking}
                >
                  <LinearGradient
                    colors={[theme.colors.warning, theme.colors.warning]}
                    style={styles.speakingButtonGradient}
                  >
                    <Icon name="stop" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
            
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading || isListening) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading || isListening}
            >
              <LinearGradient
                colors={inputText.trim() && !isLoading && !isListening ? [theme.colors.primary, theme.colors.primaryDark] : [theme.colors.muted, theme.colors.muted]}
                style={styles.sendButtonGradient}
              >
                <Icon name="send" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {/* Voice Status Indicator */}
          {isListening && (
            <View style={styles.voiceStatus}>
              <View style={styles.listeningIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.listeningText}>Listening...</Text>
              </View>
              {speechResult && (
                <Text style={styles.speechResult}>"{speechResult}"</Text>
              )}
            </View>
          )}
          
      {isSpeaking && (
            <View style={styles.voiceStatus}>
              <View style={styles.speakingIndicator}>
        <Icon name={isPaused ? 'pause' : 'volume-high'} size={16} color={theme.colors.warning} />
        <Text style={styles.speakingText}>{isPaused ? 'Paused' : 'Speaking...'}</Text>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      {/* Settings Modal */}
      <Modal transparent visible={settingsVisible} animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat Settings</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Icon name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Language</Text>
                <Text style={styles.sectionHelp}>Prefer South African languages or System default</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <TouchableOpacity key={'system'} style={[styles.presetChip, !selectedLanguage && styles.presetChipSelected]} onPress={() => setSelectedLanguage(null)}>
                    <Text style={[styles.presetChipText, !selectedLanguage && styles.presetChipTextSelected]}>System default</Text>
                  </TouchableOpacity>
                  {southAfricanLanguages.map(l => (
                    <TouchableOpacity key={l.code} style={[styles.presetChip, selectedLanguage === l.code && styles.presetChipSelected]} onPress={() => setSelectedLanguage(l.code)}>
                      <Text style={[styles.presetChipText, selectedLanguage === l.code && styles.presetChipTextSelected]}>{l.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Persona</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {agents.map((agent) => (
                    <TouchableOpacity key={agent.id} style={[styles.agentChip, selectedAgent.id === agent.id && styles.agentChipSelected, { marginBottom: 8 }]} onPress={() => handleAgentChange(agent)}>
                      <Icon name={agent.icon} size={16} color={selectedAgent.id === agent.id ? theme.colors.text : agent.color} />
                      <Text style={[styles.agentChipText, selectedAgent.id === agent.id && styles.agentChipTextSelected]}>{agent.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.sectionTitle}>Voice</Text>
                  <TouchableOpacity onPress={async () => {
                    try {
                      const voices = await (Speech as any).getAvailableVoicesAsync?.();
                      if (Array.isArray(voices)) setAvailableVoices(voices);
                    } catch {}
                  }}>
                    <Text style={[styles.sectionHelp, { color: theme.colors.primary }]}>Refresh voices</Text>
                  </TouchableOpacity>
                </View>
                {availableVoices.length === 0 ? (
                  <View>
                    <Text style={styles.sectionHelp}>No alternative voices available on this device.</Text>
                    {Platform.OS === 'android' && (
                      <TouchableOpacity style={[styles.presetChip, { alignSelf: 'flex-start', marginTop: 6 }]} onPress={async () => {
                        const playStore = 'market://details?id=com.google.android.tts';
                        const web = 'https://play.google.com/store/apps/details?id=com.google.android.tts';
                        try { await Linking.openURL(playStore); } catch { await Linking.openURL(web); }
                      }}>
                        <Text style={[styles.presetChipText, { color: theme.colors.text }]}>Get Google Speech Services</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.presetChip, { alignSelf: 'flex-start', marginTop: 6 }]} onPress={async () => {
                      try { await (Linking as any).openSettings?.(); } catch {}
                    }}>
                      <Text style={[styles.presetChipText, { color: theme.colors.text }]}>Open System Settings</Text>
                    </TouchableOpacity>
                    <Text style={[styles.sectionHelp, { marginTop: 6 }]}>After installing voices, return to the app and tap Refresh.</Text>
                  </View>
                ) : (
                  <View style={styles.voiceList}>
                    {(filteredVoices.length > 0 ? filteredVoices : availableVoices).slice(0, 12).map((v: any) => (
                      <TouchableOpacity key={v.identifier || v.name} style={[styles.voiceItem, (selectedVoiceId === (v.identifier || v.name)) && styles.voiceItemSelected]} onPress={() => setSelectedVoiceId(v.identifier || v.name)}>
                        <Text style={styles.voiceName}>{v.name || v.identifier || 'Voice'}</Text>
                        <Text style={styles.voiceMeta}>{v.language || ''}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                  {selectedVoiceId && (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Selected: {(selectedVoice as any)?.name || selectedVoiceId}</Text>
                      <TouchableOpacity style={styles.previewButton} onPress={() => handlePlayMessage("Hi, I'm your assistant. This is a voice preview.") }>
                        <Text style={styles.previewButtonText}>Preview</Text>
                      </TouchableOpacity>
                    </View>
                  )}
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Voice Style</Text>
                <Text style={styles.sectionHelp}>Choose how the assistant should sound</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {(['Balanced','Warm','Calm','Narrator','Energetic'] as VoicePreset[]).map((p) => (
                    <TouchableOpacity key={p} style={[styles.presetChip, voicePreset === p && styles.presetChipSelected]} onPress={() => setVoicePreset(p)}>
                      <Text style={[styles.presetChipText, voicePreset === p && styles.presetChipTextSelected]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Creativity (Temperature)</Text>
                <Text style={styles.sectionHelp}>Lower is more focused (0.0), higher is more creative (1.0)</Text>
                <View style={styles.tempRow}>
                  <TouchableOpacity style={styles.tempBtn} onPress={() => setTemperature(t => Math.max(0, Math.round((t - 0.1) * 10) / 10))}>
                    <Icon name="remove" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.tempValue}>{temperature.toFixed(1)}</Text>
                  <TouchableOpacity style={styles.tempBtn} onPress={() => setTemperature(t => Math.min(1, Math.round((t + 0.1) * 10) / 10))}>
                    <Icon name="add" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Data Sharing for Training</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Allow sharing of anonymized data</Text>
                  <Switch value={dataSharingConsent} onValueChange={setDataSharingConsent} />
                </View>
                {!dataSharingConsent && (
                  <Text style={styles.sectionHelp}>We won’t include your name in prompts or store chat data for training.</Text>
                )}
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setSettingsVisible(false)}>
              <Text style={styles.modalPrimaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  playBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  playBtnDisabled: {
    opacity: 0.5,
  },
  pauseButton: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  pauseButtonGradient: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
  color: theme.colors.muted,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  backgroundColor: theme.colors.glass,
    marginRight: theme.spacing.sm,
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  backgroundColor: theme.colors.glass,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionHelp: {
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  voiceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  voiceItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 12,
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  voiceItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  voiceName: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  voiceMeta: {
    fontSize: 11,
    color: theme.colors.muted,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  previewLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  previewButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  previewButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.sm,
    borderRadius: 16,
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetChipSelected: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primary,
  },
  presetChipText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600',
  },
  presetChipTextSelected: {
    color: theme.colors.text,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  tempBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tempValue: {
    width: 48,
    textAlign: 'center',
    fontWeight: '700',
    color: theme.colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  switchLabel: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  modalPrimaryBtn: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  agentSelector: {
    marginBottom: theme.spacing.sm,
  },
  agentSelectorContent: {
    paddingRight: theme.spacing.lg,
  },
  agentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.sm,
    borderRadius: 20,
  backgroundColor: theme.colors.glass,
  },
  agentChipSelected: {
  backgroundColor: theme.colors.primaryDark,
  },
  agentChipText: {
    fontSize: 14,
    fontWeight: '500',
  color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  agentChipTextSelected: {
  color: theme.colors.text,
    fontWeight: '600',
  },
  quickActionsBar: {
    marginBottom: theme.spacing.sm,
  },
  quickActionsContent: {
    paddingRight: theme.spacing.lg,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    marginRight: theme.spacing.sm,
    borderRadius: 16,
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickActionChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.md,
  },
  messageContainer: {
    marginBottom: theme.spacing.lg,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  agentSpecialty: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
  },
  aiBubble: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionBubble: {
    backgroundColor: theme.colors.success + '20',
    borderColor: theme.colors.success,
  },
  insightBubble: {
    backgroundColor: theme.colors.warning + '20',
    borderColor: theme.colors.warning,
  },
  warningBubble: {
    backgroundColor: theme.colors.danger + '20',
    borderColor: theme.colors.danger,
  },
  systemBubble: {
    backgroundColor: theme.colors.muted + '20',
    borderColor: theme.colors.muted,
  },
  loadingBubble: {
    paddingVertical: theme.spacing.md,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
  color: theme.colors.text,
  },
  aiText: {
    color: theme.colors.text,
  },
  systemText: {
    fontStyle: 'italic',
    color: theme.colors.muted,
  },
  timestamp: {
    fontSize: 11,
    marginTop: theme.spacing.xs,
  },
  userTimestamp: {
  color: theme.colors.muted,
    textAlign: 'right',
  },
  aiTimestamp: {
    color: theme.colors.muted,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.muted,
    marginHorizontal: 2,
    // Animation would be handled by a library like react-native-reanimated
  },
  // Old quick actions styles kept for reference, not used anymore
  inputContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    maxHeight: 100,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: theme.spacing.sm,
  },
  voiceButtonActive: {
    transform: [{ scale: 1.1 }],
  },
  voiceButtonDisabled: {
    opacity: 0.5,
  },
  voiceButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: theme.spacing.sm,
  },
  speakingButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceStatus: {
    paddingTop: theme.spacing.sm,
    alignItems: 'center',
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  listeningText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
    fontWeight: '500',
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakingText: {
    fontSize: 14,
    color: theme.colors.warning,
    marginLeft: theme.spacing.sm,
    fontWeight: '500',
  },
  speechResult: {
    fontSize: 12,
    color: theme.colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
});