import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, shadow } from '@/config/theme';

interface Props {
  children: React.ReactNode;
  // Using any due to custom react-native type overrides in types/react-fixes.d.ts
  // which do not export StyleProp. This keeps usage flexible (e.g., padding).
  style?: any;
  gradient?: keyof typeof theme.gradients | string[];
  border?: boolean;
  elevation?: number;
}

export default function GlassCard({ children, style, gradient, border = true, elevation = 6 }: Props) {
  const gradientColors = Array.isArray(gradient)
    ? gradient
    : gradient
    ? (theme.gradients[gradient as keyof typeof theme.gradients] as unknown as string[])
    : undefined;

  return (
    <View style={[styles.card, border && styles.withBorder, shadow(elevation, 0.16), style]}> 
      {gradientColors ? (
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFillObject as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      ) : null}
      {/* a translucent glass layer */}
      <View style={styles.glassLayer} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    overflow: 'hidden',
  },
  withBorder: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  glassLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
});
