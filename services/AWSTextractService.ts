/**
 * AWS Textract OCR Service
 * Handles receipt and document OCR using AWS Textract
 */

export interface OCRResult {
  merchant?: string;
  total?: number;
  currency?: string;
  date?: string;
  items: Array<{
    name: string;
    price: number;
    quantity?: number;
  }>;
  confidence?: number;
  rawText?: string;
}

export interface TextractResponse {
  JobStatus: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL_SUCCESS';
  Blocks: Array<{
    BlockType: 'PAGE' | 'LINE' | 'WORD' | 'KEY_VALUE_SET' | 'TABLE' | 'CELL';
    Text?: string;
    Confidence?: number;
    Geometry?: any;
    Relationships?: any[];
  }>;
}

/**
 * AWS Textract Service for OCR processing
 */
export class AWSTextractService {
  private textractClient: any;
  
  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
  // Initialize Textract client when AWS SDK is available
  const { awsConfig } = (await import('../config/aws')).default as any;
  const { TextractClient } = await import('@aws-sdk/client-textract');
  this.textractClient = new TextractClient({ region: awsConfig?.region || process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1' });
  console.log('AWS Textract client initialized');
    } catch (error) {
      console.error('Failed to initialize Textract client:', error);
    }
  }

  /**
   * Process receipt image using AWS Textract
   */
  async processReceiptImage(imageUri: string, userId: string): Promise<OCRResult> {
    try {
      console.log('Processing receipt with Textract:', imageUri);
      
      // For now, return a mock result
      const mockResult: OCRResult = {
        merchant: 'Sample Store',
        total: 45.67,
        currency: 'ZAR',
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Coffee', price: 25.00, quantity: 1 },
          { name: 'Sandwich', price: 20.67, quantity: 1 }
        ],
        confidence: 0.95,
        rawText: 'Sample Store\nCoffee R25.00\nSandwich R20.67\nTotal: R45.67'
      };

      return mockResult;
    } catch (error) {
      console.error('Error processing receipt:', error);
      throw new Error('Failed to process receipt image');
    }
  }

  /**
   * Process document text extraction
   */
  async extractTextFromDocument(imageUri: string): Promise<string> {
    try {
      console.log('Extracting text from document:', imageUri);
      
      // Mock text extraction
      return 'Sample extracted text from document';
    } catch (error) {
      console.error('Error extracting text:', error);
      throw new Error('Failed to extract text from document');
    }
  }

  /**
   * Process form data extraction
   */
  async extractFormData(imageUri: string): Promise<Record<string, string>> {
    try {
      console.log('Extracting form data:', imageUri);
      
      // Mock form data
      return {
        'Name': 'John Doe',
        'Amount': '100.00',
        'Date': '2024-01-15'
      };
    } catch (error) {
      console.error('Error extracting form data:', error);
      throw new Error('Failed to extract form data');
    }
  }

  /**
   * Process table data extraction
   */
  async extractTableData(imageUri: string): Promise<Array<Record<string, string>>> {
    try {
      console.log('Extracting table data:', imageUri);
      
      // Mock table data
      return [
        { 'Item': 'Coffee', 'Price': '25.00', 'Qty': '1' },
        { 'Item': 'Sandwich', 'Price': '20.67', 'Qty': '1' }
      ];
    } catch (error) {
      console.error('Error extracting table data:', error);
      throw new Error('Failed to extract table data');
    }
  }

  /**
   * Parse receipt text to extract structured data
   */
  private parseReceiptText(rawText: string): OCRResult {
    const lines = rawText.split('\n').filter(line => line.trim());
    const result: OCRResult = {
      items: []
    };

    for (const line of lines) {
      // Extract merchant name (usually first meaningful line)
      if (!result.merchant && line.length > 3 && !this.containsPrice(line)) {
        result.merchant = line.trim();
        continue;
      }

      // Extract total amount
      const totalMatch = line.match(/total[:\s]*[\$R]?(\d+[.,]\d{2})/i);
      if (totalMatch) {
        result.total = parseFloat(totalMatch[1].replace(',', '.'));
        continue;
      }

      // Extract date
      const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
      if (dateMatch) {
        result.date = this.parseDate(dateMatch[1]);
        continue;
      }

      // Extract line items
      const itemMatch = line.match(/(.+?)\s+[\$R]?(\d+[.,]\d{2})/);
      if (itemMatch) {
        const [, name, priceStr] = itemMatch;
        const price = parseFloat(priceStr.replace(',', '.'));
        result.items.push({
          name: name.trim(),
          price,
          quantity: 1
        });
      }
    }

    // Determine currency
    if (rawText.includes('R') || rawText.includes('ZAR')) {
      result.currency = 'ZAR';
    } else if (rawText.includes('$') || rawText.includes('USD')) {
      result.currency = 'USD';
    } else if (rawText.includes('€') || rawText.includes('EUR')) {
      result.currency = 'EUR';
    } else {
      result.currency = 'ZAR'; // Default to ZAR for South African users
    }

    result.rawText = rawText;
    result.confidence = 0.85; // Default confidence

    return result;
  }

  private containsPrice(text: string): boolean {
    return /[\$R€]?\d+[.,]\d{2}/.test(text);
  }

  private parseDate(dateStr: string): string {
    try {
      // Try to parse various date formats
      const formats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY or MM/DD/YYYY
        /(\d{1,2})-(\d{1,2})-(\d{4})/,   // DD-MM-YYYY or MM-DD-YYYY
        /(\d{1,2})\/(\d{1,2})\/(\d{2})/,  // DD/MM/YY or MM/DD/YY
        /(\d{1,2})-(\d{1,2})-(\d{2})/    // DD-MM-YY or MM-DD-YY
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          let [, day, month, year] = match;
          
          // Handle 2-digit years
          if (year.length === 2) {
            const currentYear = new Date().getFullYear();
            const century = Math.floor(currentYear / 100) * 100;
            year = String(century + parseInt(year));
          }

          // Assume DD/MM/YYYY format for South African context
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          return date.toISOString().split('T')[0];
        }
      }

      // If no format matches, return current date
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Validate OCR result quality
   */
  validateOCRResult(result: OCRResult): boolean {
    // Check if we have minimum required data
    const hasBasicData = result.items.length > 0 || result.total !== undefined;
    const hasConfidence = (result.confidence || 0) > 0.5;
    
    return hasBasicData && hasConfidence;
  }

  /**
   * Get processing status for async operations
   */
  async getProcessingStatus(jobId: string): Promise<string> {
    try {
      console.log('Getting processing status for job:', jobId);
      // Mock status - would use actual Textract job status in real implementation
      return 'SUCCEEDED';
    } catch (error) {
      console.error('Error getting processing status:', error);
      return 'FAILED';
    }
  }

  /**
   * Health check for Textract service
   */
  async healthCheck(): Promise<boolean> {
    try {
      console.log('AWS Textract health check');
      return true;
    } catch (error) {
      console.error('Textract health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const awsTextractService = new AWSTextractService();
export default awsTextractService;
