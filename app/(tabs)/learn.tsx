/**
 * Learn Tab - Financial Education Page
 * Uses the Comprehensive Curriculum-Based Education component
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/config/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
// Replaced heavy curriculum component with simplified learning module
import SimpleLearning from '../../components/SimpleLearning';

export default function Learn() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
  <SimpleLearning />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
});

