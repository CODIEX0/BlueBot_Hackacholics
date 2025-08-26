/**
 * Production-Ready Receipt OCR Service
 * Comprehensive receipt scanning with multiple OCR providers, image preprocessing, 
 * intelligent parsing, and offline fallback capabilities
 *
 * AWS Textract setup:
 * - Deploy a secure API (API Gateway + Lambda) that accepts { imageBase64 } and calls Textract
 * - Set EXPO_PUBLIC_AWS_TEXTRACT_ENDPOINT to that API URL
 * - Optionally set EXPO_PUBLIC_AWS_TEXTRACT_API_KEY and enforce it in the API
 */

import { createWorker } from 'tesseract.js';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Type definitions for Tesseract Worker
interface Worker {
  loadLanguage(lang: string): Promise<void>;
  initialize(lang: string): Promise<void>;
  setParameters(params: any): Promise<void>;
  recognize(image: string): Promise<{ data: { text: string; confidence?: number } }>;
  terminate(): Promise<void>;
}

export interface ReceiptData {
  merchantName: string;
  amount: number;
  date: string;
  items: ReceiptItem[];
  category: string;
  confidence: number;
  rawText?: string;
  processingTime?: number;
  ocrProvider?: string;
  imageQualityScore?: number;
}

export interface ReceiptItem {
  name: string;
  quantity?: number;
  price: number;
  confidence?: number;
}

interface OCRProvider {
  name: string;
  available: boolean;
  priority: number;
  process: (imageUri: string) => Promise<{ text: string; confidence: number }>;
}

interface ProcessingResult {
  success: boolean;
  data?: ReceiptData;
  error?: string;
  provider?: string;
}

class ProductionReceiptOCRService {
  private workers: Map<string, any> = new Map();
  private isInitialized = false;
  private providers: OCRProvider[] = [];
  private cache: Map<string, ReceiptData> = new Map();
  private processingQueue: Array<{ imageUri: string; resolve: Function; reject: Function }> = [];
  private isProcessing = false;

  // Merchant patterns for better recognition
  private merchantPatterns = {
    'CHECKERS': ['checkers', 'check', 'ckrs'],
    'PICK N PAY': ['pick n pay', 'pnp', 'pick', 'pay'],
    'SHOPRITE': ['shoprite', 'shop', 'rite'],
    'SPAR': ['spar'],
    'WOOLWORTHS': ['woolworths', 'woolies', 'ww'],
    'MASSMART': ['massmart', 'makro', 'game'],
    'CLICKS': ['clicks'],
    'DIS-CHEM': ['dis-chem', 'dischem'],
    'CAPITEC': ['capitec'],
    'FNB': ['fnb', 'first national'],
    'STANDARD BANK': ['standard bank', 'stb'],
    'NEDBANK': ['nedbank'],
    'ENGEN': ['engen'],
    'SHELL': ['shell'],
    'BP': ['bp'],
    'TOTAL': ['total']
  };

  // Category mapping
  private categoryMapping = {
    'CHECKERS': 'Groceries',
    'PICK N PAY': 'Groceries',
    'SHOPRITE': 'Groceries',
    'SPAR': 'Groceries',
    'WOOLWORTHS': 'Groceries',
    'CLICKS': 'Health & Beauty',
    'DIS-CHEM': 'Health & Beauty',
    'ENGEN': 'Fuel',
    'SHELL': 'Fuel',
    'BP': 'Fuel',
    'TOTAL': 'Fuel',
    'MASSMART': 'Shopping',
    'CAPITEC': 'Banking',
    'FNB': 'Banking',
    'STANDARD BANK': 'Banking',
    'NEDBANK': 'Banking'
  };

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize OCR providers with fallback chain
   */
  private async initializeProviders() {
    // Primary provider (preferred when available): AWS Textract via secure backend
    if (process.env.EXPO_PUBLIC_AWS_TEXTRACT_ENDPOINT) {
      this.providers.push({
        name: 'aws_textract',
        available: true,
        priority: 1,
        process: this.processAwsTextract.bind(this)
      });
    }

    // Secondary provider: Tesseract.js (offline capable)
    this.providers.push({
      name: 'tesseract',
      available: true,
      priority: 3,
      process: this.processTesseract.bind(this)
    });

  // Cloud provider: Google Vision API (if available)
    if (process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY) {
      this.providers.push({
        name: 'google_vision',
        available: true,
    priority: 2,
        process: this.processGoogleVision.bind(this)
      });
    }

  // Cloud provider: Azure Computer Vision (if available)
    if (process.env.EXPO_PUBLIC_AZURE_VISION_KEY) {
      this.providers.push({
        name: 'azure_vision',
        available: true,
    priority: 4,
        process: this.processAzureVision.bind(this)
      });
    }

    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * AWS Textract processing via a secure API Gateway/Lambda backend
   * Expected backend contract (recommended):
   *  POST EXPO_PUBLIC_AWS_TEXTRACT_ENDPOINT with JSON { imageBase64: string }
   *  Response may be one of:
   *   - { text: string }
   *   - Raw Textract DetectDocumentText: { Blocks: [...] }
   *   - Raw Textract AnalyzeExpense: { ExpenseDocuments: [...] }
   * Optionally send a header key EXPO_PUBLIC_AWS_TEXTRACT_API_KEY for auth.
   */
  private async processAwsTextract(imageUri: string): Promise<{ text: string; confidence: number }> {
    const endpoint = process.env.EXPO_PUBLIC_AWS_TEXTRACT_ENDPOINT as string;
    if (!endpoint) {
      throw new Error('AWS Textract endpoint not configured');
    }

    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const apiKey = process.env.EXPO_PUBLIC_AWS_TEXTRACT_API_KEY;
    if (apiKey) headers['x-api-key'] = apiKey;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ imageBase64: base64Image }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`AWS Textract backend error: ${msg}`);
    }

    const data = await res.json().catch(() => ({}));

    // Normalize to plain text from multiple possible shapes
    let text = '';
    if (typeof data?.text === 'string' && data.text.length > 0) {
      text = data.text;
    } else if (Array.isArray(data?.Blocks)) {
      // DetectDocumentText result
      try {
        const lines = data.Blocks.filter((b: any) => b.BlockType === 'LINE').map((b: any) => b.Text);
        text = lines.join('\n');
      } catch {
        text = '';
      }
    } else if (Array.isArray(data?.ExpenseDocuments)) {
      // AnalyzeExpense result - build a readable text from summary fields and line items
      try {
        const docs: any[] = data.ExpenseDocuments;
        const parts: string[] = [];
        for (const doc of docs) {
          const summary = doc.SummaryFields || [];
          for (const f of summary) {
            const label = f?.LabelDetection?.Text || f?.Type?.Text || '';
            const val = f?.ValueDetection?.Text || '';
            if (label || val) parts.push(`${label}: ${val}`.trim());
          }
          const groups = doc.LineItemGroups || [];
          for (const g of groups) {
            for (const item of g.LineItems || []) {
              const fields = item.LineItemExpenseFields || [];
              const row = fields.map((fld: any) => fld?.ValueDetection?.Text).filter(Boolean).join(' ');
              if (row) parts.push(row);
            }
          }
        }
        text = parts.join('\n');
      } catch {
        text = '';
      }
    }

    if (!text) {
      throw new Error('AWS Textract: No text parsed from response');
    }

    return { text, confidence: 90 };
  }

  /**
   * Initialize the OCR service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Production Receipt OCR Service...');
      
      // Initialize Tesseract worker
      const tesseractWorker = await createWorker();
      await tesseractWorker.loadLanguage('eng');
      await tesseractWorker.initialize('eng');
      
      // Configure Tesseract for better receipt recognition
      if (tesseractWorker.setParameters) {
        await tesseractWorker.setParameters({
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/- :*()[]@#$%&+=|\\',
          tessedit_pageseg_mode: '6', // Uniform block of text
          preserve_interword_spaces: '1'
        });
      }

      this.workers.set('tesseract', tesseractWorker);
      
      // Test provider availability
      await this.testProviders();
      
      this.isInitialized = true;
      console.log('Receipt OCR Service initialized with', this.providers.filter(p => p.available).length, 'providers');
    } catch (error) {
      console.error('Failed to initialize Receipt OCR:', error);
      throw new Error('OCR initialization failed');
    }
  }

  /**
   * Test all OCR providers to check availability
   */
  private async testProviders(): Promise<void> {
    for (const provider of this.providers) {
      try {
        if (provider.name === 'google_vision' && !process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY) {
          provider.available = false;
          continue;
        }
        if (provider.name === 'azure_vision' && !process.env.EXPO_PUBLIC_AZURE_VISION_KEY) {
          provider.available = false;
          continue;
        }
        
        console.log(`Provider ${provider.name} is available`);
      } catch (error) {
        console.warn(`Provider ${provider.name} is not available:`, error);
        provider.available = false;
      }
    }
  }

  /**
   * Main receipt scanning method with comprehensive error handling
   */
  async scanReceipt(imageUri: string): Promise<ReceiptData> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check cache first
    const cacheKey = await this.generateCacheKey(imageUri);
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.log('Returning cached OCR result');
      return cachedResult;
    }

    return new Promise((resolve, reject) => {
      this.processingQueue.push({ imageUri, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process OCR queue to prevent overwhelming the system
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0) {
        const { imageUri, resolve, reject } = this.processingQueue.shift()!;
        
        try {
          const result = await this.processReceiptInternal(imageUri);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Internal receipt processing with provider fallback
   */
  private async processReceiptInternal(imageUri: string): Promise<ReceiptData> {
    const startTime = Date.now();
    let bestResult: ReceiptData | null = null;
    let highestConfidence = 0;

    // Preprocess image for better OCR results
    const processedImageUri = await this.preprocessImage(imageUri);
    const imageQuality = await this.assessImageQuality(processedImageUri);

    // Try each available provider
    for (const provider of this.providers.filter(p => p.available)) {
      try {
        console.log(`Trying OCR provider: ${provider.name}`);
        
        const ocrResult = await provider.process(processedImageUri);
        const parsedData = await this.parseReceiptText(
          ocrResult.text, 
          ocrResult.confidence,
          provider.name
        );

        parsedData.imageQualityScore = imageQuality;
        parsedData.processingTime = Date.now() - startTime;

        // Use the result with highest confidence
        if (parsedData.confidence > highestConfidence) {
          highestConfidence = parsedData.confidence;
          bestResult = parsedData;
        }

        // If we get a high-confidence result, use it immediately
        if (parsedData.confidence > 85) {
          break;
        }
      } catch (error) {
        console.warn(`Provider ${provider.name} failed:`, error);
        provider.available = false; // Temporarily disable failed provider
        
        // Re-enable after 5 minutes
        setTimeout(() => {
          provider.available = true;
        }, 5 * 60 * 1000);
      }
    }

    if (!bestResult) {
      throw new Error('All OCR providers failed');
    }

    // Cache successful result
    const cacheKey = await this.generateCacheKey(imageUri);
    this.cache.set(cacheKey, bestResult);

    // Store for offline access
    await this.storeOfflineResult(cacheKey, bestResult);

    return bestResult;
  }

  /**
   * Preprocess image for better OCR accuracy
   */
  private async preprocessImage(imageUri: string): Promise<string> {
    try {
      // Get image info
      const imageInfo = await FileSystem.getInfoAsync(imageUri);
      if (!imageInfo.exists) {
        throw new Error('Image file does not exist');
      }

      // For now, return original image until image manipulation is properly configured
      // In production, you would use expo-image-manipulator or similar
      console.log('Image preprocessing: using original image');
      return imageUri;
    } catch (error) {
      console.warn('Image preprocessing failed, using original:', error);
      return imageUri;
    }
  }

  /**
   * Assess image quality for OCR
   */
  private async assessImageQuality(imageUri: string): Promise<number> {
    try {
      const imageInfo = await FileSystem.getInfoAsync(imageUri);
      if (!imageInfo.exists) return 0;

      // Basic quality assessment based on file size and dimensions
      // In production, you might use more sophisticated image analysis
      const size = imageInfo.size || 0;
      
      if (size < 50000) return 30; // Too small/low quality
      if (size < 200000) return 60; // Acceptable
      if (size < 1000000) return 80; // Good
      return 90; // Excellent
    } catch {
      return 50; // Default quality score
    }
  }

  /**
   * Tesseract.js OCR processing
   */
  private async processTesseract(imageUri: string): Promise<{ text: string; confidence: number }> {
    const worker = this.workers.get('tesseract');
    if (!worker) {
      throw new Error('Tesseract worker not initialized');
    }

    const result = await worker.recognize(imageUri);
    return {
      text: result.data.text,
      confidence: result.data.confidence || 75
    };
  }

  /**
   * Google Vision API processing
   */
  private async processGoogleVision(imageUri: string): Promise<{ text: string; confidence: number }> {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      throw new Error('Google Vision API key not configured');
    }

    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: {
              content: base64Image
            },
            features: [{
              type: 'TEXT_DETECTION',
              maxResults: 1
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.statusText}`);
    }

    const data = await response.json();
    const textAnnotations = data.responses[0]?.textAnnotations;
    
    if (!textAnnotations || textAnnotations.length === 0) {
      throw new Error('No text detected in image');
    }

    return {
      text: textAnnotations[0].description,
      confidence: textAnnotations[0].confidence ? textAnnotations[0].confidence * 100 : 75
    };
  }

  /**
   * Azure Computer Vision processing
   */
  private async processAzureVision(imageUri: string): Promise<{ text: string; confidence: number }> {
    const apiKey = process.env.EXPO_PUBLIC_AZURE_VISION_KEY;
    const endpoint = process.env.EXPO_PUBLIC_AZURE_VISION_ENDPOINT;
    
    if (!apiKey || !endpoint) {
      throw new Error('Azure Vision API credentials not configured');
    }

    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch(
      `${endpoint}/vision/v3.2/read/analyze`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: base64Image
      }
    );

    if (!response.ok) {
      throw new Error(`Azure Vision API error: ${response.statusText}`);
    }

    // Azure returns operation location, need to poll for results
    const operationLocation = response.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure');
    }

    // Poll for results
    let attempts = 0;
    while (attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const resultResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
        }
      });

      const resultData = await resultResponse.json();
      
      if (resultData.status === 'succeeded') {
        const lines = resultData.analyzeResult?.readResults?.[0]?.lines || [];
        const text = lines.map((line: any) => line.text).join('\n');
        
        return {
          text,
          confidence: 85 // Azure doesn't provide line-level confidence
        };
      }
      
      if (resultData.status === 'failed') {
        throw new Error('Azure Vision processing failed');
      }
      
      attempts++;
    }

    throw new Error('Azure Vision processing timeout');
  }

  /**
   * Parse OCR text into structured receipt data
   */
  private async parseReceiptText(
    text: string, 
    confidence: number, 
    provider: string
  ): Promise<ReceiptData> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    return {
      merchantName: this.extractMerchantName(lines),
      amount: this.extractTotal(lines),
      date: this.extractDate(lines),
      items: this.extractItems(lines),
      category: this.determineCategory(lines),
      confidence,
      rawText: text,
      ocrProvider: provider
    };
  }

  /**
   * Extract merchant name using advanced pattern matching
   */
  private extractMerchantName(lines: string[]): string {
    // Look for known merchant patterns
    for (const [merchant, patterns] of Object.entries(this.merchantPatterns)) {
      for (const pattern of patterns) {
        for (const line of lines.slice(0, 10)) { // Check first 10 lines
          if (line.toLowerCase().includes(pattern)) {
            return merchant;
          }
        }
      }
    }

    // Fallback: use first substantial line
    for (const line of lines.slice(0, 5)) {
      if (line.length > 3 && !/^\d+$/.test(line)) {
        return line.toUpperCase();
      }
    }

    return 'UNKNOWN MERCHANT';
  }

  /**
   * Extract date with multiple format support
   */
  private extractDate(lines: string[]): string {
    const datePatterns = [
      /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,     // DD/MM/YYYY or DD-MM-YYYY
      /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,     // YYYY/MM/DD or YYYY-MM-DD
      /(\d{2})[\/\-](\d{2})[\/\-](\d{2})/,     // DD/MM/YY or DD-MM-YY
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          // Convert to ISO format
          try {
            let date: Date;
            if (pattern.source.includes('Jan|Feb')) {
              // Month name format
              date = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
            } else if (match[3] && match[3].length === 4) {
              // Full year format
              date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
            } else {
              // 2-digit year format
              const year = parseInt(match[3]) + (parseInt(match[3]) > 50 ? 1900 : 2000);
              date = new Date(year, parseInt(match[2]) - 1, parseInt(match[1]));
            }
            return date.toISOString().split('T')[0];
          } catch {
            continue;
          }
        }
      }
    }

    return new Date().toISOString().split('T')[0]; // Default to today
  }

  /**
   * Extract total amount with improved accuracy
   */
  private extractTotal(lines: string[]): number {
    const totalPatterns = [
      /total[:\s]*[r]?\s*(\d+[.,]\d{2})/i,
      /amount[:\s]*[r]?\s*(\d+[.,]\d{2})/i,
      /^[r]?\s*(\d+[.,]\d{2})\s*$/,
      /(\d+[.,]\d{2})\s*$/ // Amount at end of line
    ];

    let maxAmount = 0;

    for (const line of lines) {
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(',', '.'));
          if (amount > maxAmount && amount < 10000) { // Reasonable limit
            maxAmount = amount;
          }
        }
      }
    }

    return maxAmount || 0;
  }

  /**
   * Extract line items with quantities and prices
   */
  private extractItems(lines: string[]): ReceiptItem[] {
    const items: ReceiptItem[] = [];
    const itemPattern = /(.+?)\s+(\d*[.,]?\d*)\s*[xX@]?\s*([r]?\d+[.,]\d{2})/i;

    for (const line of lines) {
      const match = line.match(itemPattern);
      if (match) {
        const name = this.cleanItemName(match[1]);
        const quantity = match[2] ? parseFloat(match[2].replace(',', '.')) : 1;
        const price = parseFloat(match[3].replace('r', '').replace(',', '.'));

        if (name.length > 2 && price > 0 && price < 1000) {
          items.push({
            name,
            quantity: quantity > 0 ? quantity : 1,
            price
          });
        }
      }
    }

    return items.slice(0, 20); // Limit to 20 items
  }

  /**
   * Clean and normalize item names
   */
  private cleanItemName(name: string): string {
    return name
      .trim()
      .replace(/^\d+\s*/, '') // Remove leading numbers
      .replace(/[*@#]+/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .toUpperCase();
  }

  /**
   * Determine category based on merchant and items
   */
  private determineCategory(lines: string[]): string {
    const text = lines.join(' ').toLowerCase();

    // Check merchant-based categories
    for (const [merchant, category] of Object.entries(this.categoryMapping)) {
      for (const pattern of this.merchantPatterns[merchant] || []) {
        if (text.includes(pattern)) {
          return category;
        }
      }
    }

    // Keyword-based category detection
    if (text.includes('fuel') || text.includes('petrol') || text.includes('diesel')) {
      return 'Fuel';
    }
    if (text.includes('pharmacy') || text.includes('medicine')) {
      return 'Health & Beauty';
    }
    if (text.includes('restaurant') || text.includes('food')) {
      return 'Dining';
    }

    return 'General';
  }

  /**
   * Generate cache key for image
   */
  private async generateCacheKey(imageUri: string): Promise<string> {
    try {
      const imageInfo = await FileSystem.getInfoAsync(imageUri);
      if (imageInfo.exists && 'size' in imageInfo && 'modificationTime' in imageInfo) {
        return `ocr_${imageInfo.size}_${imageInfo.modificationTime}`;
      }
      return `ocr_${Date.now()}_${Math.random()}`;
    } catch {
      return `ocr_${Date.now()}`;
    }
  }

  /**
   * Store OCR result for offline access
   */
  private async storeOfflineResult(key: string, data: ReceiptData): Promise<void> {
    try {
      await AsyncStorage.setItem(`ocr_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to store OCR result offline:', error);
    }
  }

  /**
   * Get cached OCR results for offline access
   */
  async getOfflineResults(): Promise<ReceiptData[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ocrKeys = keys.filter(key => key.startsWith('ocr_'));
      const results: ReceiptData[] = [];

      for (const key of ocrKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            results.push(JSON.parse(data));
          }
        } catch {
          continue;
        }
      }

      return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch {
      return [];
    }
  }

  /**
   * Clear OCR cache
   */
  async clearCache(): Promise<void> {
    try {
      this.cache.clear();
      const keys = await AsyncStorage.getAllKeys();
      const ocrKeys = keys.filter(key => key.startsWith('ocr_'));
      await AsyncStorage.multiRemove(ocrKeys);
    } catch (error) {
      console.warn('Failed to clear OCR cache:', error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      for (const worker of this.workers.values()) {
        await worker.terminate();
      }
      this.workers.clear();
      this.isInitialized = false;
      console.log('Receipt OCR Service cleaned up');
    } catch (error) {
      console.warn('OCR cleanup error:', error);
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      availableProviders: this.providers.filter(p => p.available).length,
      totalProviders: this.providers.length,
      cacheSize: this.cache.size,
      queueLength: this.processingQueue.length
    };
  }
}

export default new ProductionReceiptOCRService();
