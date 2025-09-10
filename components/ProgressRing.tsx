import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// @ts-ignore react-native-svg types mismatch with React 19 in this setup
import { Svg, Circle } from 'react-native-svg';

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  color?: string;
  backgroundColor?: string;
  label?: string;
  valueText?: string;
}

export default function ProgressRing({ size = 64, strokeWidth = 8, progress, color = '#6366F1', backgroundColor = 'rgba(255,255,255,0.15)', label, valueText }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* @ts-ignore */}
      <Svg width={size} height={size}>
        {/* @ts-ignore */}
        <Circle
          stroke={backgroundColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
  {/* @ts-ignore */}
  <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
  </Svg>
      <View style={styles.labelWrapper} pointerEvents="none">
        {valueText && <Text style={styles.value}>{valueText}</Text>}
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  labelWrapper: { position: 'absolute', alignItems: 'center' },
  value: { fontSize: 14, fontWeight: '700', color: '#fff' },
  label: { fontSize: 10, color: '#CBD5E1', marginTop: 2 },
});
