/**
 * Demo Mode Banner
 * Shows when the app is running in demo mode without AWS services
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAWS } from '../contexts/AWSContext';
import { Ionicons } from '@expo/vector-icons';

export interface DemoModeBannerProps {
  onDismiss?: () => void;
}

const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ onDismiss }) => {
  const { isInitialized, serviceStatus } = useAWS();
  const [dismissed, setDismissed] = React.useState(false);

  // Don't show if AWS is initialized or banner was dismissed
  if (isInitialized || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="information-circle" size={20} color="#FFA726" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Demo Mode</Text>
          <Text style={styles.message}>
            Running with sample data. AWS services unavailable.
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.dismissButton} 
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={16} color="#FFA726" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderColor: '#FFA726',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA726',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#CCCCCC',
    lineHeight: 16,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default DemoModeBanner;
