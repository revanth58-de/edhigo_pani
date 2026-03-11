import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, borderRadius, shadows } from '../theme/colors';

/**
 * GlassCard - A premium frosted glass container component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {ViewStyle} props.style Optional extra styles for the outer container
 * @param {ViewStyle} props.contentStyle Optional extra styles for the inner content
 * @param {number} props.intensity Blur intensity (1-100), default 30
 * @param {'light' | 'dark' | 'regular'} props.tint Blur tint, default 'light'
 * @param {boolean} props.noShadow Optional flag to remove drop shadow
 */
const GlassCard = ({ children, style, contentStyle, intensity = 50, tint = 'light', noShadow = false }) => {
  return (
    <View style={[styles.container, !noShadow && shadows.sm, style]}>
      <BlurView 
        intensity={intensity} 
        tint={tint} 
        style={styles.blurContainer}
      >
        <View style={[styles.innerContent, contentStyle]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden', // Ensures the blur doesn't bleed outside the border radius
    backgroundColor: 'transparent',
    borderColor: colors.glassBorder,
    borderWidth: 1,
  },
  blurContainer: {
    flex: 1,
    backgroundColor: colors.glassBgLight, // Fallback/base tint
  },
  innerContent: {
    // Defaults for inner padding, can be overridden by contentStyle
  },
});

export default GlassCard;
