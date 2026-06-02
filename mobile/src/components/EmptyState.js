/**
 * EmptyState — Reusable empty / no-data component.
 * Use it wherever a list or screen has no content to show.
 *
 * Props:
 *   icon       - MaterialIcons name  (default: 'inbox')
 *   title      - Bold heading
 *   subtitle   - Grey sub-text
 *   action     - { label, onPress } — optional CTA button
 *   style      - Override container style
 *   offline    - If true, shows a "No internet" variant
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

const EmptyState = ({
  icon = 'inbox',
  title = 'Nothing here yet',
  subtitle = '',
  action = null,
  style,
  offline = false,
}) => {
  const displayIcon = offline ? 'wifi-off' : icon;
  const displayTitle = offline ? 'No internet connection' : title;
  const displaySubtitle = offline
    ? 'Check your WiFi or mobile data and try again.'
    : subtitle;

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={offline ? ['#FEF2F2', '#FEE2E2'] : [`${colors.primary}1A`, `${colors.primary}05`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconCircle}
      >
        <MaterialIcons
          name={displayIcon}
          size={44}
          color={offline ? '#EF4444' : colors.primary}
        />
      </LinearGradient>

      <Text style={styles.title}>{displayTitle}</Text>

      {!!displaySubtitle && (
        <Text style={styles.subtitle}>{displaySubtitle}</Text>
      )}

      {action && (
        <TouchableOpacity style={styles.actionBtn} onPress={action.onPress} activeOpacity={0.8}>
          <Text style={styles.actionBtnText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#131811',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
});

export default EmptyState;
