import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import useNotificationStore from '../../store/notificationStore';
import { groupAPI } from '../../services/api';

// Icon + color per notification type
const TYPE_META = {
  job:        { icon: 'work',             color: '#3B82F6', bg: '#EFF6FF' },
  group:      { icon: 'groups',           color: '#8B5CF6', bg: '#F5F3FF' },
  payment:    { icon: 'currency-rupee',   color: '#10B981', bg: '#D1FAE5' },
  attendance: { icon: 'fact-check',       color: '#F59E0B', bg: '#FEF3C7' },
  info:       { icon: 'info-outline',     color: '#6B7280', bg: '#F9FAFB' },
};

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const NotificationItem = ({ item, onPress }) => {
  const meta = TYPE_META[item.type] || TYPE_META.info;
  return (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
        <MaterialIcons name={item.icon || meta.icon} size={24} color={meta.color} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
        </View>
        <Text style={styles.cardBody2} numberOfLines={2}>{item.body}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const NotificationsScreen = ({ navigation }) => {
  const { notifications, markRead, markAllRead, clearAll, unreadCount } = useNotificationStore();
  const unread = notifications.filter((n) => !n.read).length;

  const handlePress = useCallback((item) => {
    markRead(item.id);

    // Group invite: show accept/reject dialog
    if (item.type === 'group' && item.data?.inviteId && item.data?.groupId) {
      const { inviteId, groupId, leaderName, groupName } = item.data;
      Alert.alert(
        '\ud83e\udd1d Group Invitation',
        `${leaderName} invited you to join "${groupName}".\n\nWould you like to join?`,
        [
          {
            text: 'Reject \u274c',
            style: 'destructive',
            onPress: async () => {
              try { await groupAPI.respondToInvite(groupId, inviteId, 'reject'); }
              catch (e) { Alert.alert('Error', 'Could not reject invite.'); }
            },
          },
          {
            text: 'Accept \u2705',
            onPress: async () => {
              try {
                await groupAPI.respondToInvite(groupId, inviteId, 'accept');
                Alert.alert('\ud83c\udf89 Joined!', `You are now a member of "${groupName}".`);
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

    // All other notifications: navigate to linked screen
    if (item.data?.screen) {
      navigation.navigate(item.data.screen, item.data.params || {});
    }
  }, [markRead, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#131811" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unread > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unread} new</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {unread > 0 && (
            <TouchableOpacity style={styles.headerActionBtn} onPress={markAllRead}>
              <MaterialIcons name="done-all" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.headerActionBtn} onPress={clearAll}>
              <MaterialIcons name="delete-sweep" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <MaterialIcons name="notifications-none" size={56} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyBody}>New notifications about jobs, payments, and group invites will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationItem item={item} onPress={handlePress} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${colors.primary}14`,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12, gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#131811' },
  headerBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 9999,
  },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#131811' },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerActionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },

  // List
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  separator: { height: 8 },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardUnread: {
    borderColor: `${colors.primary}33`,
    backgroundColor: `${colors.primary}06`,
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1, marginRight: 8 },
  cardTitleUnread: { fontWeight: '800', color: '#111827' },
  cardTime: { fontSize: 11, color: '#9CA3AF', flexShrink: 0 },
  cardBody2: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },

  // Empty state
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40, gap: 16,
  },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#374151', textAlign: 'center' },
  emptyBody: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});

export default NotificationsScreen;
