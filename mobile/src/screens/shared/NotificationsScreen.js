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
      style={[styles.card, isUnread && styles.cardUnread]}
    >
      <View style={[styles.iconCircle, { backgroundColor: isUnread ? `${meta.color}15` : '#F9FAFB' }]}>
        <MaterialIcons name={item.icon || meta.icon} size={22} color={meta.color} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
        </View>
        <Text style={styles.cardBodyText} numberOfLines={2}>{item.body}</Text>
      </View>
      {isUnread && <View style={styles.unreadDot} />}
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
      <LinearGradient
        colors={['#FDFBF7', '#F3F4F6']}
        style={StyleSheet.absoluteFill}
      />
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
            <MaterialIcons name="notifications-none" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyBody}>You're all set. New notifications will appear here as they arrive.</Text>
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
    fontSize: 28,
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
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardUnread: {
    borderColor: 'rgba(16, 185, 129, 0.1)',
    backgroundColor: '#F0FDF4',
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
    marginTop: -80,
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
    fontSize: 22,
    fontWeight: '900',
    color: '#131811',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
});

export default NotificationsScreen;
