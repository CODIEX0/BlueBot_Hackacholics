// Missing module declarations

declare module "@react-native-async-storage/async-storage" {
  export default class AsyncStorage {
    static getItem(key: string): Promise<string | null>;
    static setItem(key: string, value: string): Promise<void>;
    static removeItem(key: string): Promise<void>;
    static clear(): Promise<void>;
    static getAllKeys(): Promise<string[]>;
    static multiGet(keys: string[]): Promise<[string, string | null][]>;
    static multiSet(keyValuePairs: [string, string][]): Promise<void>;
    static multiRemove(keys: string[]): Promise<void>;
  }
}

declare module "expo-sqlite" {
  export interface SQLiteDatabase {
    execAsync(query: string): Promise<void>;
    runAsync(query: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
    getAllAsync(query: string, params?: any[]): Promise<any[]>;
    getFirstAsync(query: string, params?: any[]): Promise<any>;
  }
  
  export function openDatabaseAsync(name: string): Promise<SQLiteDatabase>;
}

declare module "expo-speech" {
  export interface SpeechOptions {
    language?: string;
    pitch?: number;
    rate?: number;
    voice?: string;
    onDone?: () => void;
    onStopped?: () => void;
    onError?: (error: any) => void;
  }
  
  export function speak(text: string, options?: SpeechOptions): void;
  export function stop(): void;
  export function isSpeakingAsync(): Promise<boolean>;
  export function getAvailableVoicesAsync(): Promise<any[]>;
}

declare module "react-native-voice" {
  export interface VoiceModule {
    start(language?: string): Promise<void>;
    stop(): Promise<void>;
    isAvailable?(): Promise<boolean>;
    removeAllListeners?(): void;
    onSpeechResults?: (e: { value: string[] }) => void;
    onSpeechError?: (e: any) => void;
    onSpeechEnd?: () => void;
  }
  const Voice: VoiceModule;
  export default Voice;
}

declare module "expo-camera" {
  import { ComponentType } from 'react';
  
  export const Camera: ComponentType<{
    style?: any;
    type?: string;
    onBarCodeScanned?: (data: any) => void;
    children?: React.ReactNode;
  }>;
  
  export enum CameraType {
    back = 'back',
    front = 'front'
  }
}

declare module "ethers" {
  export class Wallet {
    constructor(privateKey: string);
    static createRandom(): Wallet;
    static fromPhrase(phrase: string): Wallet;
    address: string;
    privateKey: string;
    mnemonic?: { phrase: string };
    connect(provider: any): Wallet;
  }
  
  export namespace providers {
    export class JsonRpcProvider {
      constructor(url: string);
    }
  }
  
  // Default export for ethers object
  const ethers: {
    Wallet: typeof Wallet;
    providers: typeof providers;
    utils: {
      isAddress: (address: string) => boolean;
      [key: string]: any;
    };
    BigNumber: any;
  };
  export { ethers };
  export default ethers;
}

// React Native missing exports
declare module "react-native" {
  import { ComponentType } from 'react';
  
  export const Alert: {
    alert(title: string, message?: string, buttons?: any[], options?: any): void;
    prompt?(title: string, message?: string, callbackOrButtons?: any, type?: string, defaultValue?: string, keyboardType?: string): void;
  };
  
  export const ProgressBar: ComponentType<{
    progress?: number;
    color?: string;
    style?: any;
    indeterminate?: boolean;
  }>;
  
  export const ActivityIndicator: ComponentType<{
    size?: 'small' | 'large' | number;
    color?: string;
    animating?: boolean;
    style?: any;
  }>;
  
  export const Image: ComponentType<{
    source?: any;
    style?: any;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    onLoad?: () => void;
    onError?: () => void;
  }>;
  
  export const Switch: ComponentType<{
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    disabled?: boolean;
    trackColor?: { false?: string; true?: string };
    thumbColor?: string;
    style?: any;
  }>;
  
  // Re-export commonly used components
  export const View: ComponentType<any>;
  export const Text: ComponentType<any>;
  export const TouchableOpacity: ComponentType<any>;
  export const ScrollView: ComponentType<any>;
  export const Modal: ComponentType<any>;
  export const StyleSheet: any;
  export const Animated: any;
  export const PanResponder: any;
  export const Dimensions: any;
  export const Vibration: any;
  export const SafeAreaView: ComponentType<any>;
  export const KeyboardAvoidingView: ComponentType<any>;
  export const Platform: any;
  export const TextInput: ComponentType<any>;
}

// Google Generative AI
declare module "@google/generative-ai" {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(config: { model: string }): any;
  }
}

// React Navigation
declare module "@react-navigation/native" {
  export function useNavigation(): any;
  export function useFocusEffect(callback: () => void): void;
}

// NetInfo
declare module "@react-native-community/netinfo" {
  const NetInfo: {
    addEventListener: (callback: (state: any) => void) => () => void;
    fetch: () => Promise<any>;
  };
  export default NetInfo;
}


// Tesseract.js
declare module "tesseract.js" {
  export interface Worker {
    load(): Promise<void>;
    loadLanguage(language: string): Promise<void>;
    initialize(language: string): Promise<void>;
    recognize(image: any, options?: any): Promise<{ data: { text: string } }>;
    terminate(): Promise<void>;
    setParameters?(params: any): Promise<void>;
    writeText?(text: string, name: string): Promise<void>;
    readText?(name: string): Promise<string>;
    removeText?(name: string): Promise<void>;
    FS?: any;
  }
  
  export function createWorker(): Promise<Worker>;
  export const Tesseract: {
    createWorker(): Promise<Worker>;
    PSM: any;
  };
}

// React Native QR Code SVG
declare module "react-native-qrcode-svg" {
  import { ComponentType } from 'react';
  
  interface QRCodeProps {
    value: string;
    size?: number;
    backgroundColor?: string;
    color?: string;
    logo?: any;
    logoSize?: number;
    logoBackgroundColor?: string;
    logoMargin?: number;
    logoBorderRadius?: number;
    quietZone?: number;
    getRef?: (ref: any) => void;
  }
  
  const QRCode: ComponentType<QRCodeProps>;
  export default QRCode;
}

// Vector Icons declarations
declare module "@expo/vector-icons" {
  import { ComponentType } from 'react';
  
  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }
  
  export const AntDesign: ComponentType<IconProps>;
  export const Entypo: ComponentType<IconProps>;
  export const EvilIcons: ComponentType<IconProps>;
  export const Feather: ComponentType<IconProps>;
  export const FontAwesome: ComponentType<IconProps>;
  export const FontAwesome5: ComponentType<IconProps>;
  export const Foundation: ComponentType<IconProps>;
  export const Ionicons: ComponentType<IconProps>;
  export const MaterialIcons: ComponentType<IconProps>;
  export const MaterialCommunityIcons: ComponentType<IconProps>;
  export const Octicons: ComponentType<IconProps>;
  export const Zocial: ComponentType<IconProps>;
  export const SimpleLineIcons: ComponentType<IconProps>;
  
  export function createMultiStyleIconSet(glyphMap: any, fontFamily: string, fontFile?: string): ComponentType<IconProps>;
  export function createIconSet(glyphMap: any, fontFamily: string, fontFile?: string): ComponentType<IconProps>;
  export function createIconSetFromFontello(config: any, fontFamily?: string, fontFile?: string): ComponentType<IconProps>;
  export function createIconSetFromIcoMoon(config: any, fontFamily?: string, fontFile?: string): ComponentType<IconProps>;
}

declare module "react-native-vector-icons" {
  import { ComponentType } from 'react';
  
  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }
  
  export default class Icon extends ComponentType<IconProps> {}
  export function createMultiStyleIconSet(styles: any, fontFamily: string): ComponentType<IconProps>;
  export function createIconSet(glyphMap: any, fontFamily: string, fontFile?: string): ComponentType<IconProps>;
}
