const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Customize the config before returning it.
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native-svg': path.resolve(__dirname, 'node_modules/react-native-svg'),
    'fbjs': path.resolve(__dirname, 'node_modules/fbjs'),
    'fbjs/lib/ExecutionEnvironment': path.resolve(__dirname, 'node_modules/fbjs/lib/ExecutionEnvironment.js'),
    // Ensure assets folder in react-navigation elements resolves
    '@react-navigation/elements/lib/module/assets': path.resolve(__dirname, 'node_modules/@react-navigation/elements/lib/module/assets'),
  };

  // Add .wasm resolution
  config.resolve.extensions = Array.from(new Set([...(config.resolve.extensions || []), '.wasm']));

  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer"),
  };

  // Enable WebAssembly for packages like expo-sqlite (wa-sqlite)
  config.experiments = {
    ...(config.experiments || {}),
    asyncWebAssembly: true,
  };

  // Handle .wasm assets (used by wa-sqlite) – ensure this rule runs first
  const wasmRule = {
    test: /\.wasm$/,
    type: 'asset/resource',
    generator: {
      filename: 'static/wasm/[name][ext]'
    }
  };
  config.module.rules = [wasmRule, ...(config.module.rules || [])];

  // Add webpack asset rule for react-navigation elements icons
  config.module.rules.unshift({
    test: /@react-navigation\/elements\/lib\/module\/assets\/.*\.(png|jpg|jpeg|gif|svg)$/,
    type: 'asset/resource',
    generator: {
      filename: 'static/media/[name][ext]',
    },
  });

  return config;
};
