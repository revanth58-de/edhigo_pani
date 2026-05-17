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
      <View style={[styles.iconCircle, offline && styles.iconCircleOffline]}>
        <MaterialIcons
          name={displayIcon}
          size={48}
          color={offline ? '#EF4444' : colors.gray400}
        />
      </View>

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
    backgroundColor: colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircleOffline: {
    backgroundColor: '#FEF2F2',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
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
    fontWeight: '700',
    fontSize: 15,
  },
});

export default EmptyState;
