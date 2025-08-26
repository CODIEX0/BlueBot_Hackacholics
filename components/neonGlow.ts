import { StyleSheet } from 'react-native';

// Simple helper to create a subtle neon glow style around elements
export const neonGlow = (color: string, radius = 16) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.4,
  shadowRadius: radius,
  elevation: 8,
});

export const glowStyles = StyleSheet.create({
  purple: neonGlow('#7C3AED'),
  blue: neonGlow('#60A5FA'),
  success: neonGlow('#10B981'),
  warning: neonGlow('#F59E0B'),
});
