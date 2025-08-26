/**
 * Crypto Wallet Context - Manages crypto wallet connections and transactions
 * Supports MetaMask, WalletConnect, and other popular crypto wallets
 */

import React from 'react';
const { createContext, useContext, useReducer, useEffect } = React;
import { ethers } from 'ethers';
import { Platform } from 'react-native';

// Import crypto polyfills for React Native
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Set up global Buffer for React Native
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// Types
type EthersProvider = any;
type EthersSigner = any;

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
  gasUsed?: string;
  gasPrice?: string;
}

interface CryptoWalletState {
  isConnected: boolean;
  wallet: CryptoWallet | null;
  transactions: Transaction[];
  supportedTokens: TokenInfo[];
  isLoading: boolean;
  error: string | null;
  provider: EthersProvider | null;
  signer: EthersSigner | null;
}

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  usdValue: number;
}

type CryptoWalletAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_WALLET'; payload: CryptoWallet }
  | { type: 'DISCONNECT_WALLET' }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: { hash: string; status: Transaction['status'] } }
  | { type: 'SET_PROVIDER'; payload: { provider: EthersProvider; signer: EthersSigner } }
  | { type: 'UPDATE_BALANCE'; payload: string }
  | { type: 'SET_TOKENS'; payload: TokenInfo[] };

interface CryptoWalletContextType {
  state: CryptoWalletState;
  connectMetaMask: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  disconnectWallet: () => void;
  sendTransaction: (to: string, amount: string, token?: string) => Promise<string>;
  getTransactionHistory: () => Promise<void>;
  getTokenBalances: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
  addCustomToken: (tokenAddress: string) => Promise<void>;
  estimateGas: (to: string, amount: string, token?: string) => Promise<string>;
}

// Initial state
const initialState: CryptoWalletState = {
  isConnected: false,
  wallet: null,
  transactions: [],
  supportedTokens: [],
  isLoading: false,
  error: null,
  provider: null,
  signer: null,
};

// Reducer
function cryptoWalletReducer(state: CryptoWalletState, action: CryptoWalletAction): CryptoWalletState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_WALLET':
      return { ...state, wallet: action.payload, isConnected: true, error: null };
    case 'DISCONNECT_WALLET':
      return { ...initialState };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(tx =>
          tx.hash === action.payload.hash ? { ...tx, status: action.payload.status } : tx
        ),
      };
    case 'SET_PROVIDER':
      return { ...state, provider: action.payload.provider, signer: action.payload.signer };
    case 'UPDATE_BALANCE':
      return {
        ...state,
        wallet: state.wallet ? { ...state.wallet, balance: action.payload } : null,
      };
    case 'SET_TOKENS':
      return { ...state, supportedTokens: action.payload };
    default:
      return state;
  }
}

// Create context
const CryptoWalletContext = createContext<CryptoWalletContextType | undefined>(undefined);

// Network configurations
const NETWORKS = {
  1: { name: 'Ethereum Mainnet', rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/demo' },
  137: { name: 'Polygon', rpcUrl: 'https://polygon-rpc.com' },
  56: { name: 'BSC', rpcUrl: 'https://bsc-dataseed.binance.org' },
  43114: { name: 'Avalanche', rpcUrl: 'https://api.avax.network/ext/bc/C/rpc' },
  11155111: { name: 'Sepolia Testnet', rpcUrl: 'https://sepolia.infura.io/v3/demo' },
};

// Common ERC-20 tokens
const COMMON_TOKENS = [
  {
    address: '0xA0b86a33E6441E9e4f4A0D7aB9e3e7E8DAaB4Ac9',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },
];

// ERC-20 Token ABI (minimal)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
];

export function CryptoWalletProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cryptoWalletReducer, initialState);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
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

  // Check for MetaMask availability
  const isMetaMaskAvailable = () => {
    return Platform.OS === 'web' && typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask;
  };

  // Connect to MetaMask (Web only)
  const connectMetaMask = async () => {
    if (!isMetaMaskAvailable()) {
      dispatch({ type: 'SET_ERROR', payload: 'MetaMask not available. Please install MetaMask extension.' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Request account access
      const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Create provider and signer (compatible approach)
      const Web3Provider = (ethers as any).providers?.Web3Provider || (ethers as any).BrowserProvider;
      const provider = new Web3Provider(window.ethereum!);
      const signer = provider.getSigner ? provider.getSigner() : await provider.getSigner();
      const network = await provider.getNetwork();
      
      // Get balance
      const balance = await provider.getBalance(accounts[0]);
      const balanceInEth = ethers.utils?.formatEther ? ethers.utils.formatEther(balance) : (ethers as any).formatEther(balance);

      const wallet: CryptoWallet = {
        address: accounts[0],
        balance: balanceInEth,
        chainId: Number(network.chainId),
        network: NETWORKS[Number(network.chainId)]?.name || `Unknown (${network.chainId})`,
      };

      dispatch({ type: 'SET_WALLET', payload: wallet });
      dispatch({ type: 'SET_PROVIDER', payload: { provider, signer } });

      // Listen for account changes
      window.ethereum!.on('accountsChanged', handleAccountsChanged);
      window.ethereum!.on('chainChanged', handleChainChanged);

      // Load tokens and transaction history
      await getTokenBalances();
      await getTransactionHistory();

    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to connect to MetaMask' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Connect using WalletConnect (Mobile and Web)
  const connectWalletConnect = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // For React Native, we'll use a simplified approach
      // In a real implementation, you'd use @walletconnect/react-native-dapp
      
      if (Platform.OS !== 'web') {
        // Mobile WalletConnect implementation would go here
        throw new Error('WalletConnect mobile implementation coming soon');
      }

      // Web WalletConnect implementation
      const { default: WalletConnectProvider } = await import('@walletconnect/web3-provider');
      const QRCodeModal = await import('@walletconnect/qrcode-modal');
      
      const provider = new WalletConnectProvider({
        infuraId: 'demo', // Replace with your Infura ID
        qrcodeModal: QRCodeModal.default,
      });

      await provider.enable();

      const Web3Provider = (ethers as any).providers?.Web3Provider || (ethers as any).BrowserProvider;
      const ethersProvider = new Web3Provider(provider);
      const signer = ethersProvider.getSigner ? ethersProvider.getSigner() : await ethersProvider.getSigner();
      const address = await signer.getAddress();
      const network = await ethersProvider.getNetwork();
      const balance = await ethersProvider.getBalance(address);

      const wallet: CryptoWallet = {
        address,
        balance: ethers.utils?.formatEther ? ethers.utils.formatEther(balance) : (ethers as any).formatEther(balance),
        chainId: Number(network.chainId),
        network: NETWORKS[Number(network.chainId)]?.name || `Unknown (${network.chainId})`,
      };

      dispatch({ type: 'SET_WALLET', payload: wallet });
      dispatch({ type: 'SET_PROVIDER', payload: { provider: ethersProvider, signer } });

      // Load tokens and transaction history
      await getTokenBalances();
      await getTransactionHistory();

    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to connect with WalletConnect' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    if (Platform.OS === 'web' && window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
    dispatch({ type: 'DISCONNECT_WALLET' });
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

  // Send transaction
  const sendTransaction = async (to: string, amount: string, token?: string): Promise<string> => {
    if (!state.signer || !state.wallet) {
      throw new Error('Wallet not connected');
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      let tx;

      if (token) {
        // ERC-20 token transfer
        const Contract = (ethers as any).Contract;
        const tokenContract = new Contract(token, ERC20_ABI, state.signer);
        const decimals = await tokenContract.decimals();
        const amountWei = ethers.utils?.parseUnits ? ethers.utils.parseUnits(amount, decimals) : (ethers as any).parseUnits(amount, decimals);
        tx = await tokenContract.transfer(to, amountWei);
      } else {
        // ETH transfer
        const amountWei = ethers.utils?.parseEther ? ethers.utils.parseEther(amount) : (ethers as any).parseEther(amount);
        tx = await state.signer.sendTransaction({
          to,
          value: amountWei,
        });
      }

      const transaction: Transaction = {
        hash: tx.hash,
        from: state.wallet.address,
        to,
        value: amount,
        status: 'pending',
        timestamp: Date.now(),
      };

      dispatch({ type: 'ADD_TRANSACTION', payload: transaction });

      // Wait for confirmation
      const receipt = await tx.wait();
      
      dispatch({
        type: 'UPDATE_TRANSACTION',
        payload: { hash: tx.hash, status: receipt.status === 1 ? 'confirmed' : 'failed' },
      });

      // Update balance
      const newBalance = await state.provider!.getBalance(state.wallet.address);
      dispatch({ type: 'UPDATE_BALANCE', payload: ethers.utils.formatEther(newBalance) });

      return tx.hash;

    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Transaction failed' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Get transaction history (simplified - would use an indexer in production)
  const getTransactionHistory = async () => {
    if (!state.provider || !state.wallet) return;

    try {
      // This is a simplified version. In production, you'd use an indexing service like Moralis, Alchemy, etc.
      const latestBlock = await state.provider.getBlockNumber();
      const transactions: Transaction[] = [];

      // Check last 10 blocks for transactions (very limited approach)
      for (let i = 0; i < 10; i++) {
        const blockNumber = latestBlock - i;
        const block = await state.provider.getBlockWithTransactions(blockNumber);
        
        const userTxs = block.transactions.filter(tx => 
          tx.from?.toLowerCase() === state.wallet!.address.toLowerCase() ||
          tx.to?.toLowerCase() === state.wallet!.address.toLowerCase()
        );

        userTxs.forEach(tx => {
          transactions.push({
            hash: tx.hash,
            from: tx.from || '',
            to: tx.to || '',
            value: ethers.utils.formatEther(tx.value),
            status: 'confirmed',
            timestamp: block.timestamp * 1000,
            gasUsed: tx.gasLimit?.toString(),
            gasPrice: tx.gasPrice?.toString(),
          });
        });
      }

      // Add to existing transactions
      transactions.forEach(tx => {
        const exists = state.transactions.find(existing => existing.hash === tx.hash);
        if (!exists) {
          dispatch({ type: 'ADD_TRANSACTION', payload: tx });
        }
      });

    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
    }
  };

  // Get token balances
  const getTokenBalances = async () => {
    if (!state.provider || !state.wallet) return;

    try {
      const tokens: TokenInfo[] = [];

      for (const tokenInfo of COMMON_TOKENS) {
        try {
          const Contract = (ethers as any).Contract;
          const contract = new Contract(tokenInfo.address, ERC20_ABI, state.provider);
          const balance = await contract.balanceOf(state.wallet.address);
          const balanceFormatted = ethers.utils?.formatUnits ? ethers.utils.formatUnits(balance, tokenInfo.decimals) : (ethers as any).formatUnits(balance, tokenInfo.decimals);

          if (parseFloat(balanceFormatted) > 0) {
            tokens.push({
              ...tokenInfo,
              balance: balanceFormatted,
              usdValue: 0, // Would fetch from price API in production
            });
          }
        } catch (error) {
          console.error(`Failed to fetch balance for ${tokenInfo.symbol}:`, error);
        }
      }

      dispatch({ type: 'SET_TOKENS', payload: tokens });

    } catch (error) {
      console.error('Failed to fetch token balances:', error);
    }
  };

  // Switch network
  const switchNetwork = async (chainId: number) => {
    if (!isMetaMaskAvailable()) {
      throw new Error('MetaMask not available');
    }

    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Network not added to MetaMask, add it
        const network = NETWORKS[chainId];
        if (network) {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${chainId.toString(16)}`,
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
            }],
          });
        }
      } else {
        throw switchError;
      }
    }
  };

  // Add custom token
  const addCustomToken = async (tokenAddress: string) => {
    if (!state.provider) throw new Error('Wallet not connected');

    try {
      const Contract = (ethers as any).Contract;
      const contract = new Contract(tokenAddress, ERC20_ABI, state.provider);
      const [symbol, name, decimals] = await Promise.all([
        contract.symbol(),
        contract.name(),
        contract.decimals(),
      ]);

      const balance = await contract.balanceOf(state.wallet!.address);
      const balanceFormatted = ethers.utils?.formatUnits ? ethers.utils.formatUnits(balance, decimals) : (ethers as any).formatUnits(balance, decimals);

      const newToken: TokenInfo = {
        address: tokenAddress,
        symbol,
        name,
        decimals,
        balance: balanceFormatted,
        usdValue: 0,
      };

      dispatch({ type: 'SET_TOKENS', payload: [...state.supportedTokens, newToken] });

    } catch (error: any) {
      throw new Error(`Failed to add token: ${error.message}`);
    }
  };

  // Estimate gas
  const estimateGas = async (to: string, amount: string, token?: string): Promise<string> => {
    if (!state.signer) throw new Error('Wallet not connected');

    try {
      let gasEstimate;

      if (token) {
        const Contract = (ethers as any).Contract;
        const tokenContract = new Contract(token, ERC20_ABI, state.signer);
        const decimals = await tokenContract.decimals();
        const amountWei = ethers.utils?.parseUnits ? ethers.utils.parseUnits(amount, decimals) : (ethers as any).parseUnits(amount, decimals);
        gasEstimate = await tokenContract.estimateGas.transfer(to, amountWei);
      } else {
        const amountWei = ethers.utils?.parseEther ? ethers.utils.parseEther(amount) : (ethers as any).parseEther(amount);
        gasEstimate = await state.signer.estimateGas({
          to,
          value: amountWei,
        });
      }

      return gasEstimate.toString();

    } catch (error: any) {
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  };

  const value: CryptoWalletContextType = {
    state,
    connectMetaMask,
    connectWalletConnect,
    disconnectWallet,
    sendTransaction,
    getTransactionHistory,
    getTokenBalances,
    switchNetwork,
    addCustomToken,
    estimateGas,
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

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (data: any) => void) => void;
      removeListener: (event: string, callback: (data: any) => void) => void;
    };
  }
}
