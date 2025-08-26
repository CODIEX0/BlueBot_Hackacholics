/**
 * Voice Interaction Service
 * Handles text-to-speech and speech-to-text for BlueBot
 * Integrates with ElevenLabs API and Expo Speech
 */

import * as Speech from 'expo-speech';

interface VoiceConfig {
  enabled: boolean;
  language: string;
  voiceId: string;
  speed: number;
  pitch: number;
  personality: 'professional' | 'friendly' | 'energetic' | 'calm';
  preferFreeVoices: boolean; // Prefer OS/system TTS (free) over paid APIs
}

interface SpeechOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  voice?: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  description: string;
  category: string;
  labels: {
    accent?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
  preview_url: string;
}

class VoiceInteractionService {
  private config: VoiceConfig;
  private elevenLabsApiKey: string;
  private elevenLabsBaseUrl: string = 'https://api.elevenlabs.io/v1';
  private isInitialized: boolean = false;
  private availableVoices: ElevenLabsVoice[] = [];

  // Optional native speech-to-text module (react-native-voice)
  private rnVoice: any | null = null;
  private activeRecognition: any | null = null; // Web recognition instance

  private firstFinalDetected: boolean = false;

  // Language helpers
  private supportedLanguageCodes = [
    'en', // English
    'af', // Afrikaans
    'zu', // isiZulu
    'xh', // isiXhosa
    'nr', // isiNdebele (South Ndebele)
    'nso', // Sepedi (Northern Sotho)
    'st', // Sesotho (Southern Sotho)
    'tn', // Setswana (Tswana)
    'ss', // siSwati (Swati)
    've', // Tshivenda (Venda)
    'ts', // Xitsonga (Tsonga)
  ] as const;

  private languageToBCP47: Record<string, string> = {
    en: 'en-ZA',
    af: 'af-ZA',
    zu: 'zu-ZA',
    xh: 'xh-ZA',
    nr: 'nr-ZA',
    nso: 'nso-ZA',
    st: 'st-ZA',
    tn: 'tn-ZA',
    ss: 'ss-ZA',
    ve: 've-ZA',
    ts: 'ts-ZA',
  };
  private lastDetectedLanguageCode: string | null = null;

  private bcp47ToShortCode(bcp47: string): 'en' | 'af' | 'zu' | 'xh' | 'nr' | 'nso' | 'st' | 'tn' | 'ss' | 've' | 'ts' {
    const lower = (bcp47 || '').toLowerCase();
    if (lower === 'af-za') return 'af';
    if (lower === 'zu-za') return 'zu';
    if (lower === 'xh-za') return 'xh';
    if (lower === 'nr-za') return 'nr';
    if (lower === 'nso-za') return 'nso';
    if (lower === 'st-za') return 'st';
    if (lower === 'tn-za') return 'tn';
    if (lower === 'ss-za') return 'ss';
    if (lower === 've-za') return 've';
    if (lower === 'ts-za') return 'ts';
    return 'en';
  }

  // Predefined voice personalities for different providers
  private voicePersonalities = {
    professional: {
      elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - Professional
      expoVoice: 'en-US-male-1',
      speed: 0.9,
      pitch: 1.0,
      description: 'Clear, authoritative, and trustworthy voice for financial advice'
    },
    friendly: {
      elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Friendly (female)
      expoVoice: '', // Let OS choose the best natural female voice for the locale (e.g., en-ZA)
      speed: 0.98,
      pitch: 1.05,
      description: 'Warm, approachable voice that makes finance feel accessible'
    },
    energetic: {
      elevenLabsVoiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie - Energetic
      expoVoice: 'en-US-male-2',
      speed: 1.1,
      pitch: 1.2,
      description: 'Enthusiastic voice that motivates financial growth'
    },
    calm: {
      elevenLabsVoiceId: 'oWAxZDx7w5VEj9dCyTzz', // Grace - Calm (female)
      expoVoice: '', // Prefer OS default female for locale
      speed: 0.9,
      pitch: 0.95,
      description: 'Soothing voice that reduces financial anxiety'
    }
  };

  constructor() {
    this.config = {
      enabled: false,
      language: 'en-ZA',
      voiceId: 'friendly',
      speed: 1.0,
      pitch: 1.0,
      personality: 'friendly',
      preferFreeVoices: true,
    };
    
    this.elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';

    // Initialize default language from env if provided
    const envDefault = (process.env.EXPO_PUBLIC_DEFAULT_LANGUAGE || '').toLowerCase();
    if (envDefault && this.languageToBCP47[envDefault]) {
      this.config.language = this.languageToBCP47[envDefault];
    }
  }

  /**
   * Initialize the voice service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if speech synthesis API responds (no-op call to ensure module loaded)
      await Speech.isSpeakingAsync();

      // Try to load native voice recognition if available
      await this.ensureNativeVoiceModule();
      
      // Load available voices
      await this.loadAvailableVoices();
      
      this.isInitialized = true;
      console.log('Voice service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize voice service:', error);
      return false;
    }
  }

  /** Ensure native voice (react-native-voice) is loaded if available */
  private async ensureNativeVoiceModule(): Promise<void> {
    if (this.rnVoice) return;
    try {
      // Dynamic import so web builds don't break
      const mod: any = await import('react-native-voice');
      this.rnVoice = mod?.default || mod;
      if (this.rnVoice && typeof this.rnVoice.isAvailable === 'function') {
        try {
          const available = await this.rnVoice.isAvailable();
          console.log('Native speech recognition available:', available);
        } catch (e) {
          console.log('Native speech recognition check failed');
        }
      }
    } catch {
      // Not available (web or not installed). We'll use web API or fallback.
      this.rnVoice = null;
    }
  }

  /**
   * Enable or disable voice globally
   */
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  /** Convenience setter for language (BCP-47 like "en-US", "zu-ZA", etc.) */
  setLanguage(language: string) {
    this.config.language = language;
  }

  /** Convenience setter by short code (en|af|zu|xh|nr|nso|st|tn|ss|ve|ts) mapped to BCP-47 */
  setLanguageByCode(code: 'en' | 'af' | 'zu' | 'xh' | 'nr' | 'nso' | 'st' | 'tn' | 'ss' | 've' | 'ts') {
    const map: Record<'en'|'af'|'zu'|'xh'|'nr'|'nso'|'st'|'tn'|'ss'|'ve'|'ts', string> = {
      en: 'en-ZA',
      af: 'af-ZA',
      zu: 'zu-ZA',
      xh: 'xh-ZA',
      nr: 'nr-ZA',
      nso: 'nso-ZA',
      st: 'st-ZA',
      tn: 'tn-ZA',
      ss: 'ss-ZA',
      ve: 've-ZA',
      ts: 'ts-ZA',
    };
    this.setLanguage(map[code] || 'en-ZA');
  }

  /** Very light heuristic language detection for SA languages */
  private detectLanguageFromText(text: string): 'en-ZA' | 'af-ZA' | 'zu-ZA' | 'xh-ZA' | 'nr-ZA' | 'nso-ZA' | 'st-ZA' | 'tn-ZA' | 'ss-ZA' | 've-ZA' | 'ts-ZA' {
    const t = (text || '').toLowerCase();
    // Afrikaans indicators
    const afScore = [
      /ek\s/, /jy\s/, /ons\s/, /hulle\s/, /is\s/, /nie\s/, /maar\s/, /baie\s/, /graag\s/, /dankie/,
      /gespaarde|begroting|spaar|bank|rentekoers/
    ].reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);
    // Zulu indicators
    const zuScore = [
      /ngikhona|sawubona|yebo|cha|imali|ibhange|isabelo/, /uma\s/, /ukonga|ibhajethi|ukutshala/,
    ].reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);
    // Xhosa indicators
    const xhScore = [
      /molo|enkosi|ewe|hayi|imali|ibhanki|umlinganiselo/, /ukugcina|uhlahlo-lwabiwo-mali|utyalo-mali/,
    ].reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);
    // Ndebele (very limited)
    const nrScore = [
      /unjani|yebo|cha|imali|ibhange/, /ukugcina/
    ].reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);
    // Sepedi/Northern Sotho
    const nsoScore = [
      /dumela|ke a leboga|chelete|pego/, /poloko|go boloka/
    ].reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);
    // Sesotho
    const stScore = [
      /lumela|kea leboha|chelete| banka/, /poloko|tekanyetso/
    ].reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);
    // Setswana
    const tnScore = [
      /dumela|ke a leboga|tshelete|banka/, /poloko|tekanyetso/
    ].reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);
    // siSwati
    const ssScore = [
      /sawubona|yebo|cha|imali|ibhange/, /kulondvolota|sifundvo/
    ].reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);
    // Tshivenda
    const veScore = [
      /ndi matsheloni|ro livhuwa|tshelede|bhangi/, /u vhulunga|ndaela/
    ].reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);
    // Xitsonga
    const tsScore = [
      /avuxeni|ndza khensa|mali|bhanga/, /ku hlayisa|xikoxo|bajeti/
    ].reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);

    // English fallback
    const enScore = [
      /budget|saving|spend|bank|invest|hello|thanks/, /how much|what is|tell me/
    ].reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);

    const scores: Array<{ code: 'en-ZA' | 'af-ZA' | 'zu-ZA' | 'xh-ZA' | 'nr-ZA' | 'nso-ZA' | 'st-ZA' | 'tn-ZA' | 'ss-ZA' | 've-ZA' | 'ts-ZA'; val: number }> = [
      { code: 'af-ZA', val: afScore },
      { code: 'zu-ZA', val: zuScore },
      { code: 'xh-ZA', val: xhScore },
      { code: 'nr-ZA', val: nrScore },
      { code: 'nso-ZA', val: nsoScore },
      { code: 'st-ZA', val: stScore },
      { code: 'tn-ZA', val: tnScore },
      { code: 'ss-ZA', val: ssScore },
      { code: 've-ZA', val: veScore },
      { code: 'ts-ZA', val: tsScore },
      { code: 'en-ZA', val: enScore },
    ];
    scores.sort((a, b) => b.val - a.val);
    return (scores[0]?.val ?? 0) > 0 ? scores[0].code : 'en-ZA';
  }

  /** Get supported languages for UI display */
  getSupportedLanguages(): Array<{ code: string; bcp47: string; label: string }>{
    const labels: Record<string,string> = {
      en: 'English',
      af: 'Afrikaans',
      zu: 'isiZulu',
      xh: 'isiXhosa',
      nr: 'isiNdebele',
      nso: 'Sepedi',
      st: 'Sesotho',
      tn: 'Setswana',
      ss: 'siSwati',
      ve: 'Tshivenda',
      ts: 'Xitsonga',
    };
    return this.supportedLanguageCodes.map((code) => ({
      code,
      bcp47: this.languageToBCP47[code],
      label: labels[code] || code.toUpperCase(),
    }));
  }

  /**
   * Update voice configuration
   */
  updateConfig(newConfig: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Speak text using the configured voice service
   */
  async speak(text: string, options?: Partial<SpeechOptions>): Promise<void> {
    if (!this.config.enabled) {
      console.log('Voice is disabled');
      return;
    }

    try {
      const cleanText = this.prepareTextForSpeech(text);
      
      const usePaid = !this.config.preferFreeVoices && !!this.elevenLabsApiKey;
      if (usePaid) {
        await this.speakWithElevenLabs(cleanText, options);
      } else {
        await this.speakWithExpo(cleanText, options);
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
      // Try fallback method
      try {
        await this.speakWithExpo(text, options);
      } catch (fallbackError) {
        console.error('Fallback speech synthesis failed:', fallbackError);
      }
    }
  }

  /**
   * Speak using ElevenLabs API
   */
  private async speakWithElevenLabs(text: string, options?: Partial<SpeechOptions>): Promise<void> {
    const personality = this.voicePersonalities[this.config.personality];
    const voiceId = personality.elevenLabsVoiceId;

    const response = await fetch(
      `${this.elevenLabsBaseUrl}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: text,
          // Use multilingual model to better handle multiple languages
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.5,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // NOTE: For RN we'd need to stream/play the audio buffer using expo-av.
    // For now, we simply fallback to native TTS for playback.
    console.log('ElevenLabs audio generated successfully');
    
    await this.speakWithExpo(text, options);
  }

  /**
   * Speak using Expo Speech (native TTS)
   */
  private async speakWithExpo(text: string, options?: Partial<SpeechOptions>): Promise<void> {
    const personality = this.voicePersonalities[this.config.personality];

    // Auto-select language for TTS based on text content if it differs
    let chosenLanguage = options?.language || this.config.language;
    try {
      const detectedForTTS = this.detectLanguageFromText(text);
      if (detectedForTTS && detectedForTTS !== chosenLanguage) {
        chosenLanguage = detectedForTTS;
      }
    } catch {}
    
    const speechOptions: Speech.SpeechOptions = {
      language: chosenLanguage,
      pitch: options?.pitch ?? personality.pitch ?? this.config.pitch,
      rate: options?.rate ?? personality.speed ?? this.config.speed,
    };

    // Prefer system's natural voice for South African English; otherwise use personality voice
    const desiredVoice = options?.voice || personality.expoVoice;
    if (desiredVoice && !chosenLanguage.toLowerCase().startsWith('en-za')) {
      // @ts-ignore - voice is optional and platform-specific
      (speechOptions as any).voice = desiredVoice;
    }

    const chunks = this.chunkTextForSpeech(text, 400);
    for (const chunk of chunks) {
      await new Promise<void>((resolve, reject) => {
        Speech.speak(chunk, {
          ...speechOptions,
          onDone: () => resolve(),
          onError: (error) => reject(error),
          onStopped: () => resolve(),
        });
      });
    }
  }

  /** Split long text into speakable chunks at sentence boundaries */
  private chunkTextForSpeech(text: string, maxLen: number = 400): string[] {
    const sentences = (text || '')
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);

    const chunks: string[] = [];
    let buffer = '';
    for (const s of sentences) {
      if ((buffer + ' ' + s).trim().length <= maxLen) {
        buffer = (buffer ? buffer + ' ' : '') + s;
      } else {
        if (buffer) chunks.push(buffer.trim());
        if (s.length <= maxLen) {
          buffer = s;
        } else {
          // Hard split overly long sentences
          for (let i = 0; i < s.length; i += maxLen) {
            chunks.push(s.slice(i, i + maxLen));
          }
          buffer = '';
        }
      }
    }
    if (buffer) chunks.push(buffer.trim());
    return chunks.length ? chunks : [text];
  }

  /**
   * Stop current speech
   */
  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  /**
   * Check if currently speaking
   */
  async isSpeaking(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch (error) {
      console.error('Error checking speech status:', error);
      return false;
    }
  }

  /**
   * Start listening for speech input
   * Web: Uses Web Speech API if available
   * Native: Uses react-native-voice if available, else simulated
   */
  async startListening(language?: string, timeoutMs: number = 15000): Promise<string> {
    const lang = language || this.config.language || 'en-US';

    // Web Speech API path
    // @ts-ignore - window types not available in RN
    const SpeechRecognition = (typeof window !== 'undefined') && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (SpeechRecognition) {
      return new Promise((resolve, reject) => {
        try {
          const recognition = new SpeechRecognition();
          this.activeRecognition = recognition;
          recognition.lang = lang;
          recognition.interimResults = true;
          recognition.continuous = true;
          recognition.maxAlternatives = 1;

          this.firstFinalDetected = false;
          let finalTranscript = '';
          const timer = setTimeout(() => {
            try { recognition.stop(); } catch {}
          }, Math.max(3000, timeoutMs || 0));

          recognition.onresult = (event: any) => {
            try {
              for (let i = event.resultIndex || 0; i < event.results.length; i++) {
                const res = event.results[i];
                const txt = res?.[0]?.transcript || '';
                if (res.isFinal) {
                  if (!this.firstFinalDetected) {
                    this.firstFinalDetected = true;
                    // Early auto-detect and set for subsequent TTS
                    try {
                      const detected = this.detectLanguageFromText(txt);
                      if (detected && detected !== this.config.language) {
                        this.setLanguage(detected);
                      }
                    } catch {}
                  }
                  finalTranscript += (txt + ' ');
                }
              }
            } catch {}
          };
          recognition.onerror = (event: any) => {
            clearTimeout(timer);
            this.activeRecognition = null;
            reject(event.error || 'speech_recognition_error');
          };
          recognition.onend = () => {
            clearTimeout(timer);
            // Auto-detect and update language from final transcript as backup
            try {
              const transcript = finalTranscript.trim();
              if (transcript) {
                const detected = this.detectLanguageFromText(transcript);
                if (detected && detected !== this.config.language) {
                  this.setLanguage(detected);
                }
              }
              this.activeRecognition = null;
              resolve(finalTranscript.trim());
            } catch {
              this.activeRecognition = null;
              resolve(finalTranscript.trim());
            }
          };

          recognition.start();
        } catch (err) {
          reject(err);
        }
      });
    }

    // Native via react-native-voice if available
    await this.ensureNativeVoiceModule();
    if (this.rnVoice && typeof this.rnVoice.start === 'function') {
      return new Promise(async (resolve, reject) => {
        let resolved = false;
        const timer = setTimeout(() => {
          if (resolved) return;
          try { this.rnVoice?.stop?.(); } catch {}
        }, Math.max(3000, timeoutMs || 0));
        const cleanup = async () => {
          clearTimeout(timer);
          try {
            if (typeof this.rnVoice.removeAllListeners === 'function') {
              this.rnVoice.removeAllListeners();
            }
          } catch {}
        };
        try {
          this.rnVoice.onSpeechResults = (e: { value: string[] }) => {
            if (resolved) return;
            const transcript = Array.isArray(e?.value) ? e.value.join(' ').trim() : '';
            // Auto-detect and update language from first utterance
            try {
              const detected = this.detectLanguageFromText(transcript);
              if (detected && detected !== this.config.language) {
                this.setLanguage(detected);
              }
            } catch {}
            resolved = true;
            cleanup();
            resolve(transcript);
          };
          this.rnVoice.onSpeechError = (e: any) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            reject(e?.error || 'speech_recognition_error');
          };
          this.rnVoice.onSpeechEnd = () => {
            // If ended without results, resolve empty
            if (!resolved) {
              resolved = true;
              cleanup();
              resolve('');
            }
          };

          await this.rnVoice.start(lang);
        } catch (err) {
          cleanup();
          reject(err);
        }
      });
    }

    // Final fallback (simulate) - if no STT available
    return new Promise((resolve) => {
      console.log('Starting speech recognition (simulated)...');
      const simulatedResults = [
        'How much should I save each month?',
        'Tell me about investment options',
        'Help me create a budget',
        'What is a tax-free savings account?',
        'Explain compound interest'
      ];
      setTimeout(() => {
        const randomResult = simulatedResults[Math.floor(Math.random() * simulatedResults.length)];
        // Update language heuristically from simulated text
        const detected = this.detectLanguageFromText(randomResult);
        if (detected && detected !== this.config.language) {
          this.lastDetectedLanguageCode = this.bcp47ToShortCode(detected);
          this.setLanguage(detected);
        }
        resolve(randomResult);
      }, 2000);
    });
  }

  /** Stop listening (web/native) */
  async stopListening(): Promise<void> {
    try {
      // Web
      if (this.activeRecognition) {
        try {
          if (typeof this.activeRecognition.abort === 'function') {
            this.activeRecognition.abort();
          } else if (typeof this.activeRecognition.stop === 'function') {
            this.activeRecognition.stop();
          }
        } finally {
          this.activeRecognition = null;
        }
      }
      // Native
      await this.ensureNativeVoiceModule();
      if (this.rnVoice && typeof this.rnVoice.stop === 'function') {
        await this.rnVoice.stop();
      }
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }

  /**
   * Prepare text for better speech synthesis
   */
  private prepareTextForSpeech(text: string): string {
    // Remove markdown formatting
    let cleanText = text.replace(/[#*_`]/g, '');
    
    // Replace common abbreviations with full words
    const replacements = {
      'R': 'Rand',
      'ZAR': 'South African Rand',
      'SARS': 'South African Revenue Service',
      'SARB': 'South African Reserve Bank',
      'JSE': 'Johannesburg Stock Exchange',
      'TFSA': 'Tax-Free Savings Account',
      'RA': 'Retirement Annuity',
      'AI': 'Artificial Intelligence',
      'ATM': 'Automated Teller Machine',
      'PIN': 'Personal Identification Number',
      'SMS': 'Short Message Service',
      'URL': 'web address',
      'CEO': 'Chief Executive Officer',
      'GDP': 'Gross Domestic Product',
      'VAT': 'Value Added Tax',
      '&': 'and',
      '%': 'percent',
      '@': 'at',
      'vs': 'versus',
      'etc': 'etcetera'
    } as Record<string, string>;

    for (const [abbr, full] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      cleanText = cleanText.replace(regex, full);
    }

    // Add pauses for better speech flow
    cleanText = cleanText.replace(/\. /g, '. ');
    cleanText = cleanText.replace(/[,;]/g, '$&, ');
    cleanText = cleanText.replace(/:/g, ':, ');
    
    // Break up long numbers for better pronunciation
    cleanText = cleanText.replace(/\b(\d{1,3})(\d{3})\b/g, '$1 thousand $2');
    cleanText = cleanText.replace(/\b(\d+)000000\b/g, '$1 million');
    
    return cleanText.trim();
  }

  /**
   * Load available voices from ElevenLabs
   */
  private async loadAvailableVoices(): Promise<void> {
    if (this.config.preferFreeVoices || !this.elevenLabsApiKey) {
      console.log('Using free system TTS; skipping ElevenLabs voice loading');
      return;
    }

    try {
      const response = await fetch(`${this.elevenLabsBaseUrl}/voices`, {
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.availableVoices = data.voices || [];
        console.log(`Loaded ${this.availableVoices.length} ElevenLabs voices`);
      }
    } catch (error) {
      console.error('Failed to load ElevenLabs voices:', error);
    }
  }

  /**
   * Get available voice personalities
   */
  getVoicePersonalities(): typeof this.voicePersonalities {
    return this.voicePersonalities;
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceConfig {
    return { ...this.config };
  }

  /**
   * Check if voice service is enabled and available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.config.enabled;
  }

  /**
   * Generate speech for financial education
   */
  async speakFinancialTip(tip: string): Promise<void> {
    const introduction = "Here's a financial tip for you: ";
    const fullText = introduction + tip;
    await this.speak(fullText);
  }

  /**
   * Generate speech for AI responses
   */
  async speakAIResponse(response: string, isQuick: boolean = false): Promise<void> {
    // Always read the full text
    await this.speak(response);
  }

  /**
   * Generate contextual greetings
   */
  async speakGreeting(timeOfDay: 'morning' | 'afternoon' | 'evening'): Promise<void> {
    const greetings = {
      morning: "Good morning! I'm BlueBot, ready to help you start your day with smart financial decisions.",
      afternoon: 'Good afternoon! How can I assist you with your finances today?',
      evening: "Good evening! Let's review your financial progress or plan for tomorrow.",
    } as const;

    await this.speak(greetings[timeOfDay]);
  }

  /**
   * Provide voice feedback for user actions
   */
  async speakActionFeedback(action: string, success: boolean): Promise<void> {
    const feedback = success 
      ? `Great job! Your ${action} has been completed successfully.`
      : `There was an issue with your ${action}. Please try again.`;
    
    await this.speak(feedback);
  }
}

export default new VoiceInteractionService();
export type { VoiceConfig, SpeechOptions };
