import React from 'react';
const { useState, useCallback, useEffect, useRef, useContext, createContext } = React;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';
import { useMobileAuth } from './MobileAuthContext';

interface CryptoWallet {
  address: string;
  privateKey: string; // Encrypted in real implementation
  mnemonic: string; // Encrypted in real implementation
  balance: {
    ETH: string;
    USDC: string;
    USDT: string;
  };
  network: 'ethereum' | 'polygon' | 'celo';
}

interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  type: 'send' | 'receive';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  gasUsed?: string;
  gasFee?: string;
}

interface CryptoContextType {
  // Wallet state
  wallet: CryptoWallet | null;
  isWalletCreated: boolean;
  loading: boolean;
  
  // Wallet management
  createWallet: () => Promise<void>;
  importWallet: (mnemonic: string) => Promise<void>;
  exportWallet: () => Promise<string>;
  
  // Balance operations
  getBalance: (token?: string) => Promise<string>;
  refreshBalances: () => Promise<void>;
  
  // Transaction operations
  sendTransaction: (to: string, amount: string, token: string) => Promise<string>;
  getTransactionHistory: () => Transaction[];
  
  // QR Code operations
  generateReceiveQR: (amount?: string, token?: string) => string;
  parseQRCode: (qrData: string) => { address: string; amount?: string; token?: string } | null;
  
  // Utility functions
  validateAddress: (address: string) => boolean;
  formatAmount: (amount: string, decimals?: number) => string;
  convertToFiat: (amount: string, token: string) => Promise<number>;
}

const CryptoContext = createContext<CryptoContextType | undefined>(undefined);

export function useCrypto() {
  const context = useContext(CryptoContext);
  if (context === undefined) {
    throw new Error('useCrypto must be used within a CryptoProvider');
  }
  return context;
}

interface CryptoProviderProps {
  children: React.ReactNode;
}

export function CryptoProvider({ children }: CryptoProviderProps) {
  const { user } = useMobileAuth();
  const [wallet, setWallet] = useState<CryptoWallet | null>(null);
  const [isWalletCreated, setIsWalletCreated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  React.useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;

    try {
      const storedWallet = await AsyncStorage.getItem(`wallet_${user.id}`);
      const storedTransactions = await AsyncStorage.getItem(`transactions_${user.id}`);
      
      if (storedWallet) {
        const walletData = JSON.parse(storedWallet);
        setWallet(walletData);
        setIsWalletCreated(true);
        
        // Load transactions
        if (storedTransactions) {
          setTransactions(JSON.parse(storedTransactions));
        }
        
        // Refresh balances
        await refreshBalances(walletData);
      } else {
        // Create demo wallet data for testing
        await createDemoWallet();
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDemoWallet = async () => {
    if (!user) return;

    try {
      // Create a random wallet for demo purposes
      const randomWallet = ethers.Wallet.createRandom();
      
      const demoWallet: CryptoWallet = {
        address: randomWallet.address,
        privateKey: randomWallet.privateKey, // In real app, this would be encrypted
        mnemonic: randomWallet.mnemonic?.phrase || '',
        balance: {
          ETH: '0.125',
          USDC: '450.75',
          USDT: '0.00',
        },
        network: 'ethereum',
      };

      await AsyncStorage.setItem(`wallet_${user.id}`, JSON.stringify(demoWallet));
      setWallet(demoWallet);
      setIsWalletCreated(true);
      
      // Create demo transactions
      const demoTransactions: Transaction[] = [
        {
          id: '1',
          hash: '0x1234...abcd',
          from: demoWallet.address,
          to: '0x742d35Cc6438Cb8A9E48B69d2E3e3fA5B4e7F89A',
          amount: '50.00',
          token: 'USDC',
          type: 'send',
          status: 'confirmed',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          gasUsed: '21000',
          gasFee: '0.002',
        },
        {
          id: '2',
          hash: '0x5678...efgh',
          from: '0xA1B2C3D4E5F6789012345678901234567890ABCD',
          to: demoWallet.address,
          amount: '100.00',
          token: 'USDC',
          type: 'receive',
          status: 'confirmed',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          hash: '0x9abc...ijkl',
          from: demoWallet.address,
          to: '0xDEF123456789ABCDEF123456789ABCDEF12345678',
          amount: '0.05',
          token: 'ETH',
          type: 'send',
          status: 'confirmed',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          gasUsed: '21000',
          gasFee: '0.003',
        },
      ];

      await AsyncStorage.setItem(`transactions_${user.id}`, JSON.stringify(demoTransactions));
      setTransactions(demoTransactions);
    } catch (error) {
      console.error('Error creating demo wallet:', error);
    }
  };

  const createWallet = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Generate new wallet
      const newWallet = ethers.Wallet.createRandom();
      
      const cryptoWallet: CryptoWallet = {
        address: newWallet.address,
        privateKey: newWallet.privateKey, // Encrypt in production
        mnemonic: newWallet.mnemonic?.phrase || '',
        balance: {
          ETH: '0.00',
          USDC: '0.00',
          USDT: '0.00',
        },
        network: 'ethereum',
      };

      await AsyncStorage.setItem(`wallet_${user.id}`, JSON.stringify(cryptoWallet));
      setWallet(cryptoWallet);
      setIsWalletCreated(true);
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const importWallet = async (mnemonic: string) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Validate and import mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      
      const cryptoWallet: CryptoWallet = {
        address: wallet.address,
        privateKey: wallet.privateKey, // Encrypt in production
        mnemonic: mnemonic,
        balance: {
          ETH: '0.00',
          USDC: '0.00',
          USDT: '0.00',
        },
        network: 'ethereum',
      };

      await AsyncStorage.setItem(`wallet_${user.id}`, JSON.stringify(cryptoWallet));
      setWallet(cryptoWallet);
      setIsWalletCreated(true);
      
      // Refresh balances after import
      await refreshBalances(cryptoWallet);
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw new Error('Invalid recovery phrase');
    } finally {
      setLoading(false);
    }
  };

  const exportWallet = async (): Promise<string> => {
    if (!wallet) {
      throw new Error('No wallet available');
    }
    
    return wallet.mnemonic;
  };

  const getBalance = async (token: string = 'ETH'): Promise<string> => {
    if (!wallet) return '0.00';
    
    // In a real implementation, this would query the blockchain
    // For demo purposes, return stored balance
    return wallet.balance[token as keyof typeof wallet.balance] || '0.00';
  };

  const refreshBalances = async (walletToRefresh?: CryptoWallet) => {
    const targetWallet = walletToRefresh || wallet;
    if (!targetWallet || !user) return;

    try {
      // In a real implementation, this would query blockchain APIs
      // For demo purposes, we'll simulate balance updates
      const updatedWallet = {
        ...targetWallet,
        balance: {
          ETH: (Math.random() * 1).toFixed(6),
          USDC: (Math.random() * 1000).toFixed(2),
          USDT: (Math.random() * 100).toFixed(2),
        },
      };

      await AsyncStorage.setItem(`wallet_${user.id}`, JSON.stringify(updatedWallet));
      setWallet(updatedWallet);
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  };

  const sendTransaction = async (to: string, amount: string, token: string): Promise<string> => {
    if (!wallet || !user) {
      throw new Error('Wallet not available');
    }

    try {
      // Validate address
      if (!validateAddress(to)) {
        throw new Error('Invalid recipient address');
      }

      // Check balance
      const currentBalance = parseFloat(wallet.balance[token as keyof typeof wallet.balance] || '0');
      const sendAmount = parseFloat(amount);
      
      if (sendAmount > currentBalance) {
        throw new Error('Insufficient balance');
      }

      // Simulate transaction creation
      const txHash = `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;
      
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        hash: txHash,
        from: wallet.address,
        to,
        amount,
        token,
        type: 'send',
        status: 'pending',
        timestamp: new Date().toISOString(),
        gasUsed: '21000',
        gasFee: '0.002',
      };

      // Update transactions
      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
      await AsyncStorage.setItem(`transactions_${user.id}`, JSON.stringify(updatedTransactions));

      // Update balance
      const updatedBalance = {
        ...wallet.balance,
        [token]: (currentBalance - sendAmount).toString(),
      };
      
      const updatedWallet = {
        ...wallet,
        balance: updatedBalance,
      };
      
      setWallet(updatedWallet);
      await AsyncStorage.setItem(`wallet_${user.id}`, JSON.stringify(updatedWallet));

      // Simulate confirmation after delay
      setTimeout(async () => {
        const confirmedTransactions = updatedTransactions.map(tx =>
          tx.id === newTransaction.id ? { ...tx, status: 'confirmed' as const } : tx
        );
        setTransactions(confirmedTransactions);
        await AsyncStorage.setItem(`transactions_${user.id}`, JSON.stringify(confirmedTransactions));
      }, 3000);

      return txHash;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  };

  const getTransactionHistory = (): Transaction[] => {
    return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const generateReceiveQR = (amount?: string, token?: string): string => {
    if (!wallet) return '';
    
    const qrData = {
      address: wallet.address,
      amount,
      token,
      network: wallet.network,
    };
    
    return JSON.stringify(qrData);
  };

  const parseQRCode = (qrData: string): { address: string; amount?: string; token?: string } | null => {
    try {
      const parsed = JSON.parse(qrData);
      
      if (parsed.address && validateAddress(parsed.address)) {
        return {
          address: parsed.address,
          amount: parsed.amount,
          token: parsed.token,
        };
      }
      
      return null;
    } catch (error) {
      // Try parsing as plain address
      if (validateAddress(qrData)) {
        return { address: qrData };
      }
      
      return null;
    }
  };

  const validateAddress = (address: string): boolean => {
    try {
      return ethers.utils.isAddress(address);
    } catch {
      return false;
    }
  };

  const formatAmount = (amount: string, decimals: number = 2): string => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const convertToFiat = async (amount: string, token: string): Promise<number> => {
    // In a real implementation, this would query exchange rates
    // Mock exchange rates
    const rates: { [key: string]: number } = {
      ETH: 2000,
      USDC: 1,
      USDT: 1,
    };
    
    const rate = rates[token] || 1;
    return parseFloat(amount) * rate;
  };

  const value: CryptoContextType = {
    wallet,
    isWalletCreated,
    loading,
    createWallet,
    importWallet,
    exportWallet,
    getBalance,
    refreshBalances,
    sendTransaction,
    getTransactionHistory,
    generateReceiveQR,
    parseQRCode,
    validateAddress,
    formatAmount,
    convertToFiat,
  };

  return (
    <CryptoContext.Provider value={value}>
      {children}
    </CryptoContext.Provider>
  );
}


