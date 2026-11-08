import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Linking,
  Alert,
} from 'react-native';
import CustomLoader from '../../components/CustomLoader';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { groupAPI } from '../../services/api';
import { useTranslation } from '../../i18n';
import TopBar from '../../components/TopBar';
import useAuthStore from '../../store/authStore';

const GroupsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await groupAPI.getMyGroups();
      const allGroups = response?.data?.groups || [];
      const myLedGroups = user?.id ? allGroups.filter(g => g.leaderId === user.id) : allGroups;
      setGroups(myLedGroups);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const handleWhatsAppShare = (item) => {
    const leaderName = item.leader?.name || user?.name || 'గ్రూప్ లీడర్';
    const text = `🌾 *ఎదిగో పని (Edhigo Pani) - గ్రూప్ ఆహ్వానం!*\n\nనమస్తే! మన "${item.name}" వ్యవసాయ బృందంలో చేరండి. కలిసి పనిచేద్దాం, ఎక్కువ సంపాదిద్దాం!\n\nఇప్పుడే చేరండి: https://edhigo-pani.onrender.com`;
    const encoded = encodeURIComponent(text);
    const waUrl = `whatsapp://send?text=${encoded}`;
    const webUrl = `https://api.whatsapp.com/send?text=${encoded}`;

    Linking.canOpenURL(waUrl)
      .then(supported => {
        if (supported) Linking.openURL(waUrl);
        else Linking.openURL(webUrl);
      })
      .catch(() => Linking.openURL(webUrl));
  };

  const handleCallGroupLeader = (item) => {
    const isMyLedGroup = item.leaderId === user?.id;
    if (isMyLedGroup) {
      navigation.navigate('GroupDetail', { groupId: item.id, groupName: item.name });
    } else {
      const phone = item.leader?.phone;
      if (phone) {
        Linking.openURL(`tel:${phone}`);
      } else {
        Alert.alert(
          '📞 Group Leader',
          `Leader: ${item.leader?.name || 'Group Leader'}\nPlease chat directly in the group!`,
          [
            { text: 'Chat Now 💬', onPress: () => navigation.navigate('GroupChat', { groupId: item.id, groupName: item.name }) },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    }
  };

  const renderGroupItem = ({ item }) => {
    const isMyLedGroup = item.leaderId === user?.id;

    return (
      <View style={[styles.groupCard, isMyLedGroup && { borderColor: `${colors.primary}60`, borderWidth: 2 }]}>
        <TouchableOpacity
          style={styles.groupCardMain}
          onPress={() => navigation.navigate('GroupDetail', { groupId: item.id, groupName: item.name })}
          activeOpacity={0.8}
        >
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.groupPhoto} />
          ) : (
            <View style={[styles.groupPhotoPlaceholder, isMyLedGroup && { backgroundColor: `${colors.primary}20` }]}>
              <MaterialIcons name="groups" size={32} color={colors.primary} />
            </View>
          )}

          <View style={styles.groupInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.groupName}>{item.name}</Text>
              {isMyLedGroup && (
                <View style={{ backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>⭐ YOUR CREW (మీ బృందం)</Text>
                </View>
              )}
            </View>
            <View style={styles.typeTag}>
              <Text style={styles.typeText}>{item.type || 'General Work'}</Text>
            </View>
            <Text style={styles.memberCount}>
              {((item.members || []).filter(m => m.status === 'joined' || m.status === 'checked_in' || m.status === 'checked_out').length + 1)} Members
            </Text>
          </View>

          <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
        </TouchableOpacity>

        {/* ── Quick Action Row for Group Leader Call, Messages & WhatsApp ── */}
        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={styles.cardCallBtn}
            onPress={() => handleCallGroupLeader(item)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="call" size={16} color="#FFFFFF" />
            <Text style={styles.cardActionBtnText}>
              {isMyLedGroup ? 'CREW' : 'CALL LEADER'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardChatBtn}
            onPress={() => navigation.navigate('GroupChat', { groupId: item.id, groupName: item.name })}
            activeOpacity={0.85}
          >
            <MaterialIcons name="chat" size={16} color="#FFFFFF" />
            <Text style={styles.cardActionBtnText}>MESSAGES</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardWABtn}
            onPress={() => handleWhatsAppShare(item)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="share" size={16} color="#FFFFFF" />
            <Text style={styles.cardActionBtnText}>WHATSAPP</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TopBar title="My Groups" navigation={navigation} showBack />
      
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>Your Crews / బృందాలు</Text>
        <Text style={styles.headerSubtitle}>Manage working groups, call leaders & chat with members</Text>
      </View>

      {loading && !refreshing ? (
        <CustomLoader size={48} color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="groups" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Groups Yet</Text>
              <Text style={styles.emptyText}>Create a new group to start organizing your crew and finding group jobs.</Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      {user?.role === 'leader' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('GroupSetup')}
          activeOpacity={0.9}
        >
          <MaterialIcons name="add" size={32} color={colors.backgroundDark} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#131811',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6f8961',
    marginTop: 4,
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  groupCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  groupPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 14,
  },
  groupPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#131811',
    marginBottom: 4,
  },
  typeTag: {
    backgroundColor: colors.secondary + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b07f00',
  },
  memberCount: {
    fontSize: 13,
    color: '#6f8961',
  },
  cardActionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    gap: 6,
  },
  cardChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    gap: 6,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardWABtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    gap: 6,
  },
  cardActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#131811',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#6f8961',
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default GroupsScreen;
