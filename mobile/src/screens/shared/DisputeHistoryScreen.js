import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { disputeService } from '../../services/api';
import CustomLoader from '../../components/CustomLoader';
import EmptyState from '../../components/EmptyState';

const STATUS_COLORS = {
  pending: { bg: '#FEE2E2', text: '#EF4444', icon: 'hourglass-empty' },
  investigating: { bg: '#FEF3C7', text: '#D97706', icon: 'search' },
  resolved: { bg: '#D1FAE5', text: '#10B981', icon: 'check-circle' },
  dismissed: { bg: '#F3F4F6', text: '#6B7280', icon: 'cancel' },
};

const DisputeHistoryScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDisputes = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await disputeService.getMyDisputes();
      if (res.success) {
        setDisputes(res.data || []);
      }
    } catch (err) {
      console.warn('Failed to load disputes:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDisputes();
    }, [])
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <CustomLoader size={48} color={colors.primary} />
        </View>
      );
    }

    if (disputes.length === 0) {
      return (
        <EmptyState
          icon="report-problem"
          title={t('disputes.noDisputes')}
          subtitle="Any disputes or issues you report will appear here."
        />
      );
    }

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDisputes(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {disputes.map((dispute) => {
          const status = STATUS_COLORS[dispute.status] || STATUS_COLORS.pending;
          return (
            <View key={dispute.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.categoryWrap}>
                  <MaterialIcons name="info-outline" size={20} color="#4B5563" />
                  <Text style={styles.categoryText}>{t(`disputes.${dispute.category}`)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <MaterialIcons name={status.icon} size={14} color={status.text} />
                  <Text style={[styles.statusText, { color: status.text }]}>
                    {t(`disputes.${dispute.status}`)}
                  </Text>
                </View>
              </View>

              <Text style={styles.descriptionText}>{dispute.description}</Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Job ID: #{dispute.jobId.slice(-4).toUpperCase()}</Text>
                <Text style={styles.metaText}>{formatDate(dispute.createdAt)}</Text>
              </View>

              {dispute.resolutionDetails && (
                <View style={styles.resolutionBox}>
                  <Text style={styles.resolutionTitle}>{t('disputes.resolution')}</Text>
                  <Text style={styles.resolutionText}>{dispute.resolutionDetails}</Text>
                  <Text style={styles.resolvedDate}>
                    Resolved on {formatDate(dispute.resolvedAt)}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#131811" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('disputes.history')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  resolutionBox: {
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 12,
  },
  resolutionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 4,
  },
  resolutionText: {
    fontSize: 13,
    color: '#14532D',
    lineHeight: 18,
    marginBottom: 6,
  },
  resolvedDate: {
    fontSize: 11,
    color: '#166534',
    opacity: 0.8,
  },
});

export default DisputeHistoryScreen;
