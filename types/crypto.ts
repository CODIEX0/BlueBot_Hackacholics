/**
 * Crypto Wallet Types for BlueBot
 */

export interface CryptoWallet {
  id: string;
  address: string;
  publicKey: string;
  network: 'ethereum' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism';
  balances: Record<string, string>; // token symbol -> balance
  isSecured: boolean;
  createdAt: string;
  lastUpdated?: string;
  metadata?: {
    alias?: string;
    isDefault?: boolean;
    derivationPath?: string;
  };
}

export interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  amount: string;
  asset: string; // ETH, USDC, etc.
  network: string;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'send' | 'receive';
  timestamp: string;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  networkFee: string;
  confirmations?: number;
  nonce?: number;
  data?: string;
  metadata?: {
    description?: string;
    tags?: string[];
    merchantInfo?: {
      name: string;
      category: string;
    };
  };
}

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  network: string;
  logoUrl?: string;
  isNative: boolean;
  price?: {
    usd: number;
    lastUpdated: string;
  };
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  supportedTokens: TokenInfo[];
}

export interface WalletStats {
  totalValueUSD: number;
  totalTransactions: number;
  firstTransactionDate?: string;
  lastTransactionDate?: string;
  topTokensByValue: Array<{
    symbol: string;
    valueUSD: number;
    percentage: number;
  }>;
  monthlyVolume: Array<{
    month: string;
    volume: number;
  }>;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCost: string;
  estimatedCostUSD?: number;
}

export interface WalletBackup {
  mnemonic?: string;
  privateKey?: string;
  address: string;
  network: string;
  createdAt: string;
  encryptionLevel: 'device' | 'user_password' | 'biometric';
}

export interface DeFiPosition {
  protocol: string;
  type: 'lending' | 'staking' | 'liquidity_pool' | 'farming';
  tokens: Array<{
    symbol: string;
    amount: string;
    valueUSD: number;
  }>;
  apy?: number;
  rewards?: Array<{
    symbol: string;
    amount: string;
    valueUSD: number;
  }>;
  network: string;
  contractAddress: string;
}

export interface CryptoPortfolio {
  wallets: CryptoWallet[];
  totalValueUSD: number;
  totalChangeUSD24h: number;
  totalChangePercent24h: number;
  tokenBreakdown: Array<{
    symbol: string;
    totalAmount: string;
    totalValueUSD: number;
    percentage: number;
    wallets: string[];
  }>;
  defiPositions?: DeFiPosition[];
}

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  priceImpact: number;
  gasEstimate: GasEstimate;
  route: Array<{
    protocol: string;
    percentage: number;
  }>;
  validUntil: string;
}

export interface CryptoAlert {
  id: string;
  type: 'price' | 'transaction' | 'balance';
  condition: {
    symbol?: string;
    threshold: number;
    direction: 'above' | 'below';
  };
  message: string;
  isActive: boolean;
  createdAt: string;
  lastTriggered?: string;
}

export interface WalletError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: {
    operation: string;
    network?: string;
    address?: string;
  };
}
