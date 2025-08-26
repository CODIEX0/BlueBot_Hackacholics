const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure we can resolve all SVG and crypto modules properly
config.resolver.alias = {
  ...config.resolver.alias,
  'fbjs/lib/ExecutionEnvironment': require.resolve('fbjs/lib/ExecutionEnvironment'),
  'react-native-svg': path.resolve(__dirname, 'node_modules/react-native-svg'),
  'crypto': require.resolve('crypto-browserify'),
  'stream': require.resolve('stream-browserify'),
  'buffer': require.resolve('buffer'),
  // Alias missing close-icon assets from react-navigation elements
  '@react-navigation/elements/lib/module/assets/close-icon.png': path.resolve(__dirname, 'assets/close-icon.png'),
  '@react-navigation/elements/lib/module/assets/close-icon.svg': path.resolve(__dirname, 'assets/close-icon.svg'),
};

// Add platforms for better web support
config.resolver.platforms = [
  'web',
  'native',
  'ios',
  'android',
];

// Ensure these file extensions are handled
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'js',
  'json',
  'ts',
  'tsx',
  'jsx',
  'web.js',
  'web.ts',
  'web.tsx',
];

// Add png, svg and wasm to assetExts for image and wasm files
config.resolver.assetExts = [
  ...(config.resolver.assetExts || []),
  'png',
  'svg',
  'wasm',
];

// Enable symlinks
config.resolver.symlinks = true;

// Add node modules resolver for better compatibility
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;
