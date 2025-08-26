import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '@/config/theme';
import GlassCard from '@/components/GlassCard';

export default function FAQScreen() {
  const faqs = [
    { q: 'What is BlueBot?', a: 'BlueBot helps you track expenses, learn personal finance, and get AI-powered insights.' },
    { q: 'How do I add an expense?', a: 'Tap the + button in the tab bar. Long-press for quick actions like scanning a receipt.' },
    { q: 'How do I change themes?', a: 'Go to Profile > App Settings > Theme to switch between Dark and Light.' },
    { q: 'How do I contact support?', a: 'Use Profile > Support > Contact Us to email the team.' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
      <Text style={styles.title}>Help Center</Text>
      {faqs.map((item, idx) => (
        <GlassCard key={idx} style={styles.card} border>
          <Text style={styles.question}>{item.q}</Text>
          <Text style={styles.answer}>{item.a}</Text>
        </GlassCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  card: {
    marginBottom: 12,
    padding: 16,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    color: theme.colors.muted,
  },
});
