/**
 * AWS S3 Service
 * Handles uploads of receipt images and other assets to S3
 */

import { S3_CONFIG } from '../config/aws';

export class AWSS3Service {
  private s3: any | null = null;
  private ready = false;

  constructor() {}

  private async initializeIfNeeded() {
    if (this.ready && this.s3) return;
    try {
      // Avoid literal to prevent Metro from pre-bundling a missing dep
      const modName = ['@aws-sdk', 'client-s3'].join('/');
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const dynImport = new Function('m', 'return import(m)');
      const { S3Client, PutObjectCommand } = await dynImport(modName);
      const region = S3_CONFIG.region || process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1';
      const credentials = {
        accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.EXPO_PUBLIC_AWS_SESSION_TOKEN,
      };
      this.s3 = { S3Client, PutObjectCommand, client: new S3Client({ region, credentials }) };
      this.ready = true;
      console.log('AWS S3 client initialized');
    } catch (err) {
      console.warn('S3 client not initialized (missing dependency or env). Will fallback.', err);
      this.ready = false;
    }
  }

  /**
   * Upload an image from a local URI (Expo) to S3 and return the public or s3 URL.
   * Falls back to returning the local URI if the S3 client is not available.
   */
  async uploadImageFromUri(uri: string, key: string, contentType = 'image/jpeg'): Promise<string> {
    try {
      await this.initializeIfNeeded();
      if (!this.ready || !this.s3) {
        console.warn('S3 not ready — returning original URI');
        return uri;
      }

      const bucket = S3_CONFIG.bucketName;
      if (!bucket) throw new Error('S3 bucket not configured');

      // Read file bytes using Expo FileSystem and convert to Uint8Array
      const FileSystem = await import('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const bytes = this.base64ToBytes(base64);

      const put = new this.s3.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      });
      await this.s3.client.send(put);

      // If the bucket is public or has CloudFront, you might build a URL; default to s3:// style
      const publicBase = process.env.EXPO_PUBLIC_S3_PUBLIC_URL_BASE; // optional, e.g., https://cdn.example.com
      if (publicBase) return `${publicBase.replace(/\/$/, '')}/${encodeURIComponent(key)}`;
      return `s3://${bucket}/${key}`;
    } catch (err) {
      console.error('Failed to upload to S3, returning original URI:', err);
      return uri;
    }
  }

  private base64ToBytes(b64: string): Uint8Array {
    // Atob polyfill using Buffer for RN/Expo
    try {
      // Dynamically import buffer to avoid bundling issues
      const { Buffer } = require('buffer');
      return Uint8Array.from(Buffer.from(b64, 'base64'));
    } catch {
      // Fallback manual decoder
      const binary_string = globalThis.atob ? globalThis.atob(b64) : this.polyfillAtob(b64);
      const len = binary_string.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary_string.charCodeAt(i);
      return bytes;
    }
  }

  private polyfillAtob(input: string): string {
    // Minimal base64 decoder polyfill
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = input.replace(/=+$/, '');
    let output = '';
    if (str.length % 4 === 1) throw new Error('Invalid base64');
    for (let bc = 0, bs = 0, buffer, idx = 0; (buffer = str.charAt(idx++)); ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  }

  async healthCheck(): Promise<boolean> {
    return this.ready;
  }
}

export const awsS3Service = new AWSS3Service();
export default awsS3Service;
