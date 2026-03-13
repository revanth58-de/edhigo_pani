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
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import useNotificationStore from '../../store/notificationStore';
import { groupAPI } from '../../services/api';
import GlassCard from '../../components/GlassCard';

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
  const isUnread = !item.read;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      style={styles.cardWrapper}
    >
      <GlassCard 
        intensity={isUnread ? 80 : 30}
        tint="light"
        style={[styles.card, isUnread && styles.cardUnread]}
        contentStyle={styles.cardContent}
      >
        <View style={[styles.iconCircle, { backgroundColor: isUnread ? `${meta.color}20` : meta.bg }]}>
          <MaterialIcons name={item.icon || meta.icon} size={24} color={meta.color} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
          </View>
          <Text style={styles.cardBody2} numberOfLines={2}>{item.body}</Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </GlassCard>
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
    <LinearGradient
      colors={['#FDFBF7', colors.backgroundLight]}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Spacer for translucent status bar */}
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.black} />
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
              <MaterialIcons name="delete-sweep" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <MaterialIcons name="notifications-none" size={64} color={colors.gray200} />
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
          showsVerticalScrollIndicator={false}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingBottom: 16,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 16, gap: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.black },
  headerBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 9999,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerActionBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.glassBgLight,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },

  // List
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  separator: { height: 12 },

  // Card
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  cardUnread: {
    borderColor: `${colors.primary}4D`,
    borderWidth: 2,
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1, marginRight: 8 },
  cardTitleUnread: { fontWeight: '900', color: colors.black },
  cardTime: { fontSize: 12, color: colors.textMuted, fontWeight: '600', flexShrink: 0 },
  cardBody2: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, fontWeight: '500' },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },

  // Empty state
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40, gap: 20,
  },
  emptyIconCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: colors.glassBgLight,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.glassBorder,
  },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  emptyBody: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
});

export default NotificationsScreen;
