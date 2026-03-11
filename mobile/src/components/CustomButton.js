import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, borderRadius, shadows } from '../theme/colors';

/**
 * CustomButton - A premium button component with support for gradients and outlines
 */
const CustomButton = ({ 
  title, 
  onPress, 
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false, 
  loading = false,
  style,
  textStyle,
  iconLeft,
  iconRight,
}) => {
  const getContainerStyles = () => {
    let baseStyle = [styles.container];
    
    // Size variants
    if (size === 'sm') baseStyle.push(styles.sizeSm);
    else if (size === 'lg') baseStyle.push(styles.sizeLg);
    else baseStyle.push(styles.sizeMd);

    // Style variants (non-gradient parts)
    if (variant === 'outline') baseStyle.push(styles.outline);
    else if (variant === 'ghost') baseStyle.push(styles.ghost);
    else baseStyle.push(shadows.sm); // Add shadow to solid buttons

    if (disabled) baseStyle.push(styles.disabled);
    
    return baseStyle;
  };

  const getTextColor = () => {
    if (disabled) return colors.gray400;
    if (variant === 'outline' || variant === 'ghost') return colors.primary;
    return colors.white;
  };

  // If primary or secondary, use LinearGradient wrapper
  const isGradient = (variant === 'primary' || variant === 'secondary') && !disabled;
  const gradientColors = variant === 'primary' ? colors.primaryGradient : colors.secondaryGradient;

  const content = (
    <View style={styles.contentRow}>
      {iconLeft && <View style={styles.iconLeft}>{iconLeft}</View>}
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={[
          styles.text, 
          size === 'sm' && styles.textSm,
          size === 'lg' && styles.textLg,
          { color: getTextColor() }, 
          textStyle
        ]}>
          {title}
        </Text>
      )}
      {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
    </View>
  );

  if (isGradient) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[getContainerStyles(), style, { padding: 0, borderWidth: 0 }]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.md }]}
        />
        <View style={getContainerStyles()}>
           {content}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[getContainerStyles(), style]} 
      onPress={onPress} 
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  sizeMd: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  sizeLg: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
    elevation: 0,
    shadowOpacity: 0,
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 14,
  },
  textLg: {
    fontSize: 18,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default CustomButton;
