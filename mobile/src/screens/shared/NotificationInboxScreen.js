import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  Platform,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { notificationService } from '../../services/api/notificationService';
import { groupAPI } from '../../services/api';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import CustomLoader from '../../components/CustomLoader';

// Meta definitions for styling the various notification types dynamically
const TYPE_META = {
  job:        { icon: 'work',             color: '#3B82F6', bg: '#EFF6FF' },
  group:      { icon: 'groups',           color: '#8B5CF6', bg: '#F5F3FF' },
  payment:    { icon: 'currency-rupee',   color: '#10B981', bg: '#D1FAE5' },
  attendance: { icon: 'fact-check',       color: '#F59E0B', bg: '#FEF3C7' },
  machinery:  { icon: 'agriculture',      color: '#059669', bg: '#ECFDF5' },
  info:       { icon: 'info-outline',     color: '#6B7280', bg: '#F9FAFB' },
};

// Formats relative time
const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

// Infers the category of notification from its content to apply proper icons/colors
const getNotificationType = (item) => {
  const title = (item.title || '').toLowerCase();
  const body = (item.body || '').toLowerCase();
  const data = item.data || {};
  const screen = (data.screen || '').toLowerCase();

  if (screen.includes('machinery') || title.includes('machinery') || title.includes('booking') || body.includes('booked')) {
    return 'machinery';
  }
  if (screen.includes('payment') || title.includes('payment') || body.includes('paid') || title.includes('earning')) {
    return 'payment';
  }
  if (screen.includes('attendance') || title.includes('attendance') || body.includes('arrived') || body.includes('finished') || body.includes('check-in') || body.includes('check-out') || title.includes('arrived') || title.includes('finished') || title.includes('arriving')) {
    return 'attendance';
  }
  if (screen.includes('group') || title.includes('group') || body.includes('group') || body.includes('invited')) {
    return 'group';
  }
  if (screen.includes('job') || title.includes('job') || body.includes('job') || screen.includes('offer')) {
    return 'job';
  }
  return 'info';
};

const NotificationItem = ({ item, onPress }) => {
  const type = getNotificationType(item);
  const meta = TYPE_META[type] || TYPE_META.info;
  const isUnread = !item.isRead;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      style={[styles.card, isUnread && styles.cardUnread]}
    >
      <View style={[styles.iconCircle, { backgroundColor: isUnread ? `${meta.color}15` : '#F3F4F6' }]}>
        <MaterialIcons name={meta.icon} size={22} color={meta.color} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.cardBodyText} numberOfLines={3}>{item.body}</Text>
      </View>
      {isUnread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const NotificationInboxScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      if (user?.role === 'worker') {
        navigation.navigate('WorkerHome');
      } else if (user?.role === 'leader') {
        navigation.navigate('LeaderHome');
      } else {
        navigation.navigate('FarmerHome');
      }
    }
  };

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState(null);

  const limit = 20;

  // Loads notifications from backend db
  const fetchNotifications = useCallback(async (currentOffset = 0, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setError(null);
    } else if (currentOffset === 0) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    const result = await notificationService.getNotifications(currentOffset, limit);
    
    if (result.success && result.data) {
      const { notifications: list, pagination, unreadCount: count } = result.data;
      
      setNotifications((prev) => {
        if (currentOffset === 0) return list;
        // Deduplicate just in case
        const merged = [...prev];
        list.forEach((item) => {
          if (!merged.some((x) => x.id === item.id)) {
            merged.push(item);
          }
        });
        return merged;
      });

      setHasMore(pagination.hasMore);
      setUnreadCount(count || 0);
      setOffset(pagination.offset);
    } else {
      setError(result.message || 'Error fetching notifications');
    }

    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, []);

  // Run load on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications(0);
    }, [fetchNotifications])
  );

  // Listen for real-time notifications via Socket.io
  useEffect(() => {
    const handleNewSocketNotif = (notif) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    };

    const { socketService } = require('../../services/socketService');
    socketService.on('notification:new', handleNewSocketNotif);

    return () => {
      socketService.off('notification:new', handleNewSocketNotif);
    };
  }, []);

  const handleRefresh = () => {
    fetchNotifications(0, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNotifications(offset + limit);
    }
  };

  // Mark single read & navigate
  const handlePress = async (item) => {
    if (!item.isRead) {
      // Optmistic update to keep UI responsive
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Call API
      await notificationService.markAsRead(item.id);

      // Sync with Zustand store to clear bell icon badge count
      try {
        const useNotificationStore = require('../../store/notificationStore').default;
        useNotificationStore.getState().markRead(item.id);
      } catch (err) {
        console.warn('Could not sync read state with store:', err.message);
      }
    }

    // Direct user to linked screen (safely parsing stringified JSON data if needed)
    let navData = item.data;
    if (typeof navData === 'string') {
      try {
        navData = JSON.parse(navData);
      } catch (_) {}
    }

    const type = getNotificationType(item);
    if (type === 'group' && navData?.inviteId && navData?.groupId) {
      const { inviteId, groupId, leaderName, groupName } = navData;
      Alert.alert(
        '🤝 Group Invitation',
        `${leaderName || 'Group Leader'} invited you to join "${groupName || 'Group'}".\n\nWould you like to join?`,
        [
          {
            text: 'Reject ❌',
            style: 'destructive',
            onPress: async () => {
              try {
                await groupAPI.respondToInvite(groupId, inviteId, 'reject');
              } catch (e) {
                Alert.alert('Error', 'Could not reject invite.');
              }
            },
          },
          {
            text: 'Accept ✅',
            onPress: async () => {
              try {
                await groupAPI.respondToInvite(groupId, inviteId, 'accept');
                Alert.alert('🎉 Joined!', `You are now a member of "${groupName || 'Group'}".`);
              } catch (e) {
                Alert.alert('Error', 'Could not accept invite. Please try again.');
              }
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    if (navData && navData.screen) {
      navigation.navigate(navData.screen, navData.params || { jobId: navData.jobId });
    }
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    
    Alert.alert(
      t('notifications.title', 'Notifications'),
      t('notifications.markAllRead', 'Mark all as read?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.confirm', 'Confirm'),
          onPress: async () => {
            // Optimistic update
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);

            // API Call
            await notificationService.markAllAsRead();

            // Sync with Zustand store to clear bell icon badge count
            try {
              const useNotificationStore = require('../../store/notificationStore').default;
              useNotificationStore.getState().markAllRead();
            } catch (err) {
              console.warn('Could not sync markAllRead with store:', err.message);
            }
          },
        },
      ]
    );
  };

  // Renders beautiful skeleton loaders
  const renderSkeletons = () => {
    return (
      <View style={styles.list}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <View key={idx} style={styles.skeletonCard}>
            <View style={styles.skeletonIcon} />
            <View style={styles.skeletonBody}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonText} />
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FDFBF7', '#F3F4F6']}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Spacer for status bar */}
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.black} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('notifications.title', 'Notifications')}</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {unreadCount} {t('notifications.unread', 'unread')}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.headerActionBtn} onPress={handleMarkAllRead}>
              <MaterialIcons name="done-all" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && notifications.length === 0 ? (
        renderSkeletons()
      ) : error && notifications.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>{t('common.error', 'Error')}</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchNotifications(0)}>
            <Text style={styles.retryText}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <MaterialIcons name="notifications-none" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t('notifications.noNotifications', 'No notifications yet')}</Text>
          <Text style={styles.emptyBody}>
            We'll let you know when something important happens!
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationItem item={item} onPress={handlePress} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() =>
            loadingMore ? (
              <View style={styles.footerLoader}>
                <CustomLoader size={24} color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#131811',
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  separator: {
    height: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardUnread: {
    borderColor: 'rgba(16, 185, 129, 0.12)',
    backgroundColor: '#F2FDF6',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#131811',
    flex: 1,
    marginRight: 8,
  },
  cardTitleUnread: {
    color: '#064E3B',
  },
  cardTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  cardBodyText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#131811',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  footerLoader: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Skeletons
  skeletonCard: {
    backgroundColor: '#EAEAEA',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    opacity: 0.6,
  },
  skeletonIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#CCCCCC',
  },
  skeletonBody: {
    flex: 1,
    gap: 8,
  },
  skeletonTitle: {
    height: 16,
    width: '40%',
    backgroundColor: '#CCCCCC',
    borderRadius: 4,
  },
  skeletonText: {
    height: 14,
    width: '85%',
    backgroundColor: '#CCCCCC',
    borderRadius: 4,
  },
});

export default NotificationInboxScreen;
