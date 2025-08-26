import React from 'react';
const { useState, useCallback, useEffect, useRef, useContext, createContext } = React;
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WalletTransaction {
  id: string;
  type: 'send' | 'receive' | 'topup' | 'withdrawal' | 'payment';
  amount: number;
  fee: number;
  recipientId?: string;
  recipientName?: string;
  recipientPhone?: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  reference: string;
  qrCode?: string;
}

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  isFrequent: boolean;
}

interface WalletContextType {
  balance: number;
  transactions: WalletTransaction[];
  contacts: Contact[];
  loading: boolean;
  
  // Balance operations
  topUpWallet: (amount: number, method: string) => Promise<void>;
  withdrawFromWallet: (amount: number, method: string) => Promise<void>;
  
  // Transfer operations
  sendMoney: (recipientPhone: string, amount: number, description?: string) => Promise<string>;
  sendMoneyByQR: (qrData: string, amount: number) => Promise<string>;
  requestMoney: (fromPhone: string, amount: number, description?: string) => Promise<string>;
  
  // Transaction management
  getTransactionById: (id: string) => WalletTransaction | undefined;
  cancelTransaction: (id: string) => Promise<void>;
  
  // Contacts
  addContact: (name: string, phoneNumber: string) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  getFrequentContacts: () => Contact[];
  
  // QR Code
  generateQRCode: (amount?: number, description?: string) => string;
  
  // Utility
  formatCurrency: (amount: number) => string;
  validatePhoneNumber: (phone: string) => boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [balance, setBalance] = useState(2847.50);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const [storedBalance, storedTransactions, storedContacts] = await Promise.all([
        AsyncStorage.getItem('walletBalance'),
        AsyncStorage.getItem('walletTransactions'),
        AsyncStorage.getItem('walletContacts'),
      ]);

      if (storedBalance) {
        setBalance(parseFloat(storedBalance));
      }

      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      } else {
        // Add sample transactions
        const sampleTransactions: WalletTransaction[] = [
          {
            id: 'txn_001',
            type: 'receive',
            amount: 500.00,
            fee: 0,
            recipientName: 'John Doe',
            recipientPhone: '+27712345678',
            description: 'Payment for services',
            status: 'completed',
            timestamp: '2025-01-20T10:30:00Z',
            reference: 'REF001',
          },
          {
            id: 'txn_002',
            type: 'send',
            amount: 150.00,
            fee: 2.50,
            recipientName: 'Mary Smith',
            recipientPhone: '+27723456789',
            description: 'Lunch money',
            status: 'completed',
            timestamp: '2025-01-19T14:15:00Z',
            reference: 'REF002',
          },
          {
            id: 'txn_003',
            type: 'topup',
            amount: 1000.00,
            fee: 0,
            description: 'Top-up at Shoprite',
            status: 'completed',
            timestamp: '2025-01-18T09:45:00Z',
            reference: 'REF003',
          },
        ];
        setTransactions(sampleTransactions);
        await AsyncStorage.setItem('walletTransactions', JSON.stringify(sampleTransactions));
      }

      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      } else {
        // Add sample contacts
        const sampleContacts: Contact[] = [
          {
            id: 'contact_001',
            name: 'John Doe',
            phoneNumber: '+27712345678',
            isFrequent: true,
          },
          {
            id: 'contact_002',
            name: 'Mary Smith',
            phoneNumber: '+27723456789',
            isFrequent: true,
          },
          {
            id: 'contact_003',
            name: 'Peter Johnson',
            phoneNumber: '+27734567890',
            isFrequent: false,
          },
        ];
        setContacts(sampleContacts);
        await AsyncStorage.setItem('walletContacts', JSON.stringify(sampleContacts));
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveWalletData = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem('walletBalance', balance.toString()),
        AsyncStorage.setItem('walletTransactions', JSON.stringify(transactions)),
        AsyncStorage.setItem('walletContacts', JSON.stringify(contacts)),
      ]);
    } catch (error) {
      console.error('Error saving wallet data:', error);
    }
  };

  const topUpWallet = async (amount: number, method: string) => {
    try {
      const transaction: WalletTransaction = {
        id: 'txn_' + Date.now(),
        type: 'topup',
        amount,
        fee: 0,
        description: `Top-up via ${method}`,
        status: 'completed',
        timestamp: new Date().toISOString(),
        reference: 'REF' + Date.now(),
      };

      setBalance(prev => prev + amount);
      setTransactions(prev => [transaction, ...prev]);
      await saveWalletData();
    } catch (error) {
      throw new Error('Top-up failed');
    }
  };

  const withdrawFromWallet = async (amount: number, method: string) => {
    if (amount > balance) {
      throw new Error('Insufficient balance');
    }

    try {
      const transaction: WalletTransaction = {
        id: 'txn_' + Date.now(),
        type: 'withdrawal',
        amount,
        fee: 5.00, // Withdrawal fee
        description: `Withdrawal via ${method}`,
        status: 'completed',
        timestamp: new Date().toISOString(),
        reference: 'REF' + Date.now(),
      };

      setBalance(prev => prev - amount - 5.00);
      setTransactions(prev => [transaction, ...prev]);
      await saveWalletData();
    } catch (error) {
      throw new Error('Withdrawal failed');
    }
  };

  const sendMoney = async (recipientPhone: string, amount: number, description = '') => {
    if (amount > balance) {
      throw new Error('Insufficient balance');
    }

    if (!validatePhoneNumber(recipientPhone)) {
      throw new Error('Invalid phone number');
    }

    try {
      const fee = amount * 0.01; // 1% fee
      const contact = contacts.find(c => c.phoneNumber === recipientPhone);
      
      const transaction: WalletTransaction = {
        id: 'txn_' + Date.now(),
        type: 'send',
        amount,
        fee,
        recipientPhone,
        recipientName: contact?.name || 'Unknown',
        description: description || 'Money transfer',
        status: 'completed',
        timestamp: new Date().toISOString(),
        reference: 'REF' + Date.now(),
      };

      setBalance(prev => prev - amount - fee);
      setTransactions(prev => [transaction, ...prev]);
      await saveWalletData();

      return transaction.id;
    } catch (error) {
      throw new Error('Transfer failed');
    }
  };

  const sendMoneyByQR = async (qrData: string, amount: number) => {
    try {
      const qrInfo = JSON.parse(qrData);
      return await sendMoney(qrInfo.phone, amount, qrInfo.description);
    } catch (error) {
      throw new Error('Invalid QR code');
    }
  };

  const requestMoney = async (fromPhone: string, amount: number, description = '') => {
    try {
      const transaction: WalletTransaction = {
        id: 'txn_' + Date.now(),
        type: 'receive',
        amount,
        fee: 0,
        recipientPhone: fromPhone,
        description: description || 'Money request',
        status: 'pending',
        timestamp: new Date().toISOString(),
        reference: 'REF' + Date.now(),
      };

      setTransactions(prev => [transaction, ...prev]);
      await saveWalletData();

      return transaction.id;
    } catch (error) {
      throw new Error('Request failed');
    }
  };

  const getTransactionById = (id: string) => {
    return transactions.find(t => t.id === id);
  };

  const cancelTransaction = async (id: string) => {
    const transaction = getTransactionById(id);
    if (!transaction || transaction.status !== 'pending') {
      throw new Error('Cannot cancel this transaction');
    }

    try {
      setTransactions(prev => 
        prev.map(t => 
          t.id === id ? { ...t, status: 'cancelled' as const } : t
        )
      );
      await saveWalletData();
    } catch (error) {
      throw new Error('Cancellation failed');
    }
  };

  const addContact = async (name: string, phoneNumber: string) => {
    if (!validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number');
    }

    const existingContact = contacts.find(c => c.phoneNumber === phoneNumber);
    if (existingContact) {
      throw new Error('Contact already exists');
    }

    try {
      const newContact: Contact = {
        id: 'contact_' + Date.now(),
        name,
        phoneNumber,
        isFrequent: false,
      };

      setContacts(prev => [...prev, newContact]);
      await saveWalletData();
    } catch (error) {
      throw new Error('Failed to add contact');
    }
  };

  const removeContact = async (id: string) => {
    try {
      setContacts(prev => prev.filter(c => c.id !== id));
      await saveWalletData();
    } catch (error) {
      throw new Error('Failed to remove contact');
    }
  };

  const getFrequentContacts = () => {
    return contacts.filter(c => c.isFrequent);
  };

  const generateQRCode = (amount?: number, description?: string) => {
    const qrData = {
      phone: '+27712345678', // Current user's phone
      amount,
      description,
      timestamp: Date.now(),
    };
    
    return JSON.stringify(qrData);
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\+27[0-9]{9}$|^0[0-9]{9}$/;
    return phoneRegex.test(phone);
  };

  const value: WalletContextType = {
    balance,
    transactions,
    contacts,
    loading,
    topUpWallet,
    withdrawFromWallet,
    sendMoney,
    sendMoneyByQR,
    requestMoney,
    getTransactionById,
    cancelTransaction,
    addContact,
    removeContact,
    getFrequentContacts,
    generateQRCode,
    formatCurrency,
    validatePhoneNumber,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

