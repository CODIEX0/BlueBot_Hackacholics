// React Type Fixes - make React more compatible
declare module "react" {
  // Import everything from the actual react types
  export * from "react";
  
  // Also provide default export
  import React from "react";
  export = React;
  export as namespace React;
}

// Fix for @expo/vector-icons compatibility
declare module "@expo/vector-icons" {
  import { ComponentType } from 'react';
  
  export const Ionicons: ComponentType<{
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }>;
  
  export const MaterialIcons: ComponentType<{
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }>;
}

// React Native component type fixes
declare module "react-native" {
  import * as React from 'react';
  
  interface ViewStyle {
    [key: string]: any;
  }
  
  interface TextStyle extends ViewStyle {
    [key: string]: any;
  }
  
  interface ViewProps {
    style?: ViewStyle | ViewStyle[];
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  interface TextProps {
    style?: TextStyle | TextStyle[];
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  interface ScrollViewProps {
    style?: ViewStyle | ViewStyle[];
    contentContainerStyle?: ViewStyle | ViewStyle[];
    children?: React.ReactNode;
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    ref?: React.RefObject<any>;
    onContentSizeChange?: () => void;
    [key: string]: any;
  }
  
  interface SafeAreaViewProps {
    style?: ViewStyle | ViewStyle[];
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  interface KeyboardAvoidingViewProps {
    style?: ViewStyle | ViewStyle[];
    children?: React.ReactNode;
    behavior?: 'height' | 'position' | 'padding';
    [key: string]: any;
  }
  
  interface TouchableOpacityProps {
    style?: ViewStyle | ViewStyle[];
    children?: React.ReactNode;
    onPress?: () => void;
    [key: string]: any;
  }
  
  interface TextInputProps {
    style?: TextStyle | TextStyle[];
    value?: string;
    placeholder?: string;
    onChangeText?: (text: string) => void;
    onSubmitEditing?: () => void;
    multiline?: boolean;
    [key: string]: any;
  }

  class ScrollView extends React.Component<ScrollViewProps> {}
  
  export const View: React.ComponentType<ViewProps>;
  export const Text: React.ComponentType<TextProps>;
  export { ScrollView };
  export const SafeAreaView: React.ComponentType<SafeAreaViewProps>;
  export const KeyboardAvoidingView: React.ComponentType<KeyboardAvoidingViewProps>;
  export const TouchableOpacity: React.ComponentType<TouchableOpacityProps>;
  export const TextInput: React.ComponentType<TextInputProps>;
  
  export const Platform: {
    OS: 'ios' | 'android' | 'web';
    select: <T>(options: { ios?: T; android?: T; web?: T; default?: T }) => T;
  };
  
  export const StyleSheet: {
    create: <T>(styles: T) => T;
  };
  
  export const Alert: {
    alert: (title: string, message?: string, buttons?: any[], options?: any) => void;
  };

  export const Linking: {
    openURL: (url: string) => Promise<void>;
    canOpenURL?: (url: string) => Promise<boolean>;
  };
}

// Fix for expo-linear-gradient compatibility
declare module "expo-linear-gradient" {
  import { ComponentType } from 'react';
  
  export const LinearGradient: ComponentType<{
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    style?: any;
    children?: React.ReactNode;
  }>;
}

// Fix for expo-router compatibility
declare module "expo-router" {
  import { ComponentType } from 'react';
  
  export const Tabs: ComponentType<{
    screenOptions?: any;
    children?: React.ReactNode;
  }>;
  
  export namespace Tabs {
    const Screen: ComponentType<{
      name: string;
      options?: any;
    }>;
  }
  
  export const Stack: ComponentType<{
    screenOptions?: any;
    children?: React.ReactNode;
  }>;
  
  export namespace Stack {
    const Screen: ComponentType<{
      name: string;
      options?: any;
    }>;
  }
  
  export const Link: ComponentType<{
    href: string;
    children?: React.ReactNode;
    style?: any;
    asChild?: boolean;
  }>;
  
  export function useRouter(): {
    push: (path: string) => void;
    back: () => void;
    replace: (path: string) => void;
  };
  
  export const Link: ComponentType<{
    href: string;
    children?: React.ReactNode;
    style?: any;
    [key: string]: any;
  }>;
}

// Global type fixes
declare global {
  namespace React {
    type ReactNode = 
      | ReactElement
      | string
      | number
      | boolean
      | null
      | undefined
      | ReactNode[]
      | Iterable<ReactNode>;
  }
}
