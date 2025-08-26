/**
 * Simplified Crypto Wallet Context for MetaMask and WalletConnect
 * Focus on working implementation for React Native Expo
 */

import React from 'react';
const { createContext, useContext, useState, useEffect } = React;
import { Platform, Alert } from 'react-native';

// Import polyfills for React Native
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Set up global Buffer for React Native
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// Types
interface CryptoWallet {
  address: string;
  balance: string;
  chainId: number;
  network: string;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
}

interface CryptoWalletContextType {
  isConnected: boolean;
  wallet: CryptoWallet | null;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  connectMetaMask: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  disconnectWallet: () => void;
  sendTransaction: (to: string, amount: string) => Promise<string>;
  clearError: () => void;
}

// Create context
const CryptoWalletContext = createContext<CryptoWalletContextType | undefined>(undefined);

// Network configurations
const NETWORKS: { [key: number]: string } = {
  1: 'Ethereum Mainnet',
  137: 'Polygon',
  56: 'BSC',
  11155111: 'Sepolia Testnet',
};

export function CryptoWalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState<CryptoWallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for MetaMask availability
  const isMetaMaskAvailable = () => {
    return Platform.OS === 'web' && typeof window !== 'undefined' && 
           (window as any).ethereum && (window as any).ethereum.isMetaMask;
  };

  // Connect to MetaMask (Web only)
  const connectMetaMask = async () => {
    if (!isMetaMaskAvailable()) {
      setError('MetaMask not available. Please install MetaMask extension or use mobile wallet.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ethereum = (window as any).ethereum;
      
      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Get network info
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      const chainIdNumber = parseInt(chainId, 16);

      // Get balance using eth_getBalance
      const balanceHex = await ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest']
      });
      
      // Convert hex balance to ETH (simplified conversion)
      const balanceWei = parseInt(balanceHex, 16);
      const balanceEth = (balanceWei / Math.pow(10, 18)).toFixed(4);

      const walletData: CryptoWallet = {
        address: accounts[0],
        balance: balanceEth,
        chainId: chainIdNumber,
        network: NETWORKS[chainIdNumber] || `Unknown (${chainIdNumber})`,
      };

      setWallet(walletData);
      setIsConnected(true);

      // Listen for account changes
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      // Add mock transactions for demo
      const mockTransactions: Transaction[] = [
        {
          hash: '0x1234...5678',
          from: accounts[0],
          to: '0xabcd...efgh',
          value: '0.1',
          status: 'confirmed',
          timestamp: Date.now() - 86400000, // 1 day ago
        },
        {
          hash: '0x2345...6789',
          from: accounts[0],
          to: '0xbcde...fghi',
          value: '0.05',
          status: 'confirmed',
          timestamp: Date.now() - 172800000, // 2 days ago
        }
      ];
      setTransactions(mockTransactions);

    } catch (error: any) {
      setError(error.message || 'Failed to connect to MetaMask');
      setIsConnected(false);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect using WalletConnect (Placeholder for now)
  const connectWalletConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (Platform.OS === 'web') {
        // For now, show an alert that WalletConnect is coming soon
        Alert.alert(
          'WalletConnect', 
          'WalletConnect integration coming soon! Use MetaMask for now.',
          [{ text: 'OK' }]
        );
      } else {
        // Mobile implementation would go here
        Alert.alert(
          'Mobile Wallet', 
          'Mobile wallet integration coming soon! This will support Trust Wallet, MetaMask Mobile, and other mobile wallets.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      setError(error.message || 'Failed to connect with WalletConnect');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    if (Platform.OS === 'web' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereum.removeListener?.('chainChanged', handleChainChanged);
    }
    setIsConnected(false);
    setWallet(null);
    setTransactions([]);
    setError(null);
  };

  // Handle account changes
  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      await connectMetaMask();
    }
  };

  // Handle chain changes
  const handleChainChanged = async () => {
    await connectMetaMask();
  };

  // Send transaction (simplified)
  const sendTransaction = async (to: string, amount: string): Promise<string> => {
    if (!isConnected || !wallet) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);

    try {
      const ethereum = (window as any).ethereum;
      
      // Convert amount to wei (simplified)
      const amountWei = Math.floor(parseFloat(amount) * Math.pow(10, 18)).toString(16);
      
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet.address,
          to,
          value: `0x${amountWei}`,
        }],
      });

      // Add transaction to list
      const newTransaction: Transaction = {
        hash: txHash,
        from: wallet.address,
        to,
        value: amount,
        status: 'pending',
        timestamp: Date.now(),
      };

      setTransactions(prev => [newTransaction, ...prev]);

      // Simulate confirmation after 5 seconds
      setTimeout(() => {
        setTransactions(prev => 
          prev.map(tx => 
            tx.hash === txHash ? { ...tx, status: 'confirmed' as const } : tx
          )
        );
      }, 5000);

      return txHash;

    } catch (error: any) {
      setError(error.message || 'Transaction failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error
  const clearError = () => setError(null);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (isMetaMaskAvailable()) {
        try {
          const ethereum = (window as any).ethereum;
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectMetaMask();
          }
        } catch (error) {
          console.log('Auto-connect failed:', error);
        }
      }
    };

    autoConnect();
  }, []);

  const value: CryptoWalletContextType = {
    isConnected,
    wallet,
    transactions,
    isLoading,
    error,
    connectMetaMask,
    connectWalletConnect,
    disconnectWallet,
    sendTransaction,
    clearError,
  };

  return (
    <CryptoWalletContext.Provider value={value}>
      {children}
    </CryptoWalletContext.Provider>
  );
}

export function useCryptoWallet() {
  const context = useContext(CryptoWalletContext);
  if (context === undefined) {
    throw new Error('useCryptoWallet must be used within a CryptoWalletProvider');
  }
  return context;
}

// This context uses a simplified approach that avoids the global Window type conflict
