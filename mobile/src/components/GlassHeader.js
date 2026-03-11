import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { colors, fonts, shadows } from '../theme/colors';

/**
 * GlassHeader - A frosted glass header component with optional back button
 */
const GlassHeader = ({ title, showBack = true, rightComponent, onBackPress }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <BlurView intensity={70} tint="light" style={styles.blurContainer}>
        <View style={styles.headerContent}>
          {showBack ? (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={onBackPress || (() => navigation.goBack())}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.rightContainer}>
            {rightComponent || <View style={styles.placeholder} />}
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Positioning it over the content
    zIndex: 10,
    ...shadows.sm,
  },
  blurContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    backgroundColor: colors.glassBgLight,
    paddingTop: 50, // SafeArea spacing
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassBgLight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 40,
  },
});

export default GlassHeader;
