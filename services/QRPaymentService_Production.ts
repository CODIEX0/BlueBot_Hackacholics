/**
 * Production QR Payment Service (Stub for tests)
 */
export interface QRData { amount: string; address: string; currency?: string; memo?: string }

function sanitize(str: string) {
  return String(str || '')
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[<>"'`;]/g, '')
    .slice(0, 256);
}

export class QRPaymentService {
  async validateQRCode(input: string): Promise<{ isValid: boolean; error?: string; data?: QRData }> {
    try {
      // Reject obvious non-URL or unsafe schemes
      if (!input || /^(javascript:|data:|file:)/i.test(input)) {
        return { isValid: false, error: 'Invalid QR format' };
      }
      const data = this.validateQRCodePayload(input);
      return { isValid: true, data };
    } catch (e) {
      return { isValid: false, error: 'Invalid QR format' };
    }
  }

  validateQRCodePayload(qr: string | Record<string, any>): QRData {
    const obj = typeof qr === 'string' ? this.parseURI(qr) : qr;
    const amount = sanitize(obj.amount);
    const address = sanitize(obj.address);
    const currency = sanitize(obj.currency || 'ZAR');
    const memo = sanitize(obj.memo || '');
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Invalid address');
    if (!(Number(amount) > 0)) throw new Error('Invalid amount');
    return { amount, address, currency, memo };
  }

  parseURI(uri: string): QRData {
    if (!/^https:\/\//i.test(uri)) throw new Error('Insecure QR URI');
    try {
      const u = new URL(uri);
      const amount = u.searchParams.get('amount') || '';
      const address = u.searchParams.get('address') || '';
      const currency = u.searchParams.get('currency') || 'ZAR';
      const memo = u.searchParams.get('memo') || '';
      return { amount, address, currency, memo };
    } catch {
      throw new Error('Malformed QR');
    }
  }
}

const service = new QRPaymentService();
export default service;
