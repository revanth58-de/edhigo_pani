import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import CustomLoader from '../../components/CustomLoader';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { groupAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { getRoleSafeScreen } from '../../utils/navigationHelper';
import { socketService } from '../../services/socketService';

const QUICK_REPLIES = [
  { text: 'వస్తున్నాను 👍', label: 'Coming / వస్తున్నాను' },
  { text: 'సరే ✅', label: 'OK / సరే' },
  { text: 'చేరుకున్నాను 📍', label: 'Arrived / చేరుకున్నాను' },
  { text: 'కాల్ చేయండి 📞', label: 'Call Me / కాల్ చేయండి' },
  { text: 'పని పూర్తయింది 🌾', label: 'Done / పని పూర్తి' },
];

const GroupDetailScreen = ({ route, navigation }) => {
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const user = useAuthStore.getState().user;
      navigation.navigate(getRoleSafeScreen('WorkerHome', user?.role));
    }
  };

  const { groupId, groupName } = route?.params || {};
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('Jobs'); // 'Jobs' | 'Chat'
  
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  const groupRef = React.useRef(null);
  const updateGroup = useCallback((data) => {
    setGroup(data);
    groupRef.current = data;
  }, []);

  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fetchGroupDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await groupAPI.getGroupDetails(groupId);
      const groupData = res.data.group || res.data;
      updateGroup(groupData);
      if (activeTab === 'Jobs') fetchJobs(groupData);
    } catch (error) {
      console.warn('Failed to fetch group details:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId, activeTab, fetchJobs, updateGroup]);

  const fetchJobs = useCallback(async (groupData) => {
    const currentGroup = groupData || groupRef.current;
    if (!currentGroup || currentGroup.leaderId !== user?.id) return;

    try {
      setJobsLoading(true);
      const res = await groupAPI.getGroupJobs(groupId);
      setJobs(res.data.jobs || res.data || []);
    } catch (error) {
      console.warn('Failed to fetch group jobs', error);
    } finally {
      setJobsLoading(false);
    }
  }, [groupId, user?.id]);

  const fetchChat = useCallback(async () => {
    try {
      setChatLoading(true);
      const res = await groupAPI.getGroupMessages(groupId);
      const msgs = res.data?.data || res.data?.messages || res.data || [];
      setMessages(msgs);
    } catch (error) {
      console.warn('Failed to fetch chat messages', error);
    } finally {
      setChatLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchGroupDetails();
      if (activeTab === 'Chat') fetchChat();
    }, [fetchGroupDetails, fetchChat, activeTab])
  );

  // Handle real-time incoming messages
  useEffect(() => {
    socketService.joinGroupRoom(groupId);

    const handleGroupDeleted = () => {
      Alert.alert('Group Dissolved', 'The leader has deleted this group.');
      handleBack();
    };
    socketService.on('group:deleted', handleGroupDeleted);

    const handleNewMessage = (message) => {
      setMessages(prev => {
        const optimisticIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.content === message.content && m.senderId === message.senderId);
        
        if (optimisticIndex >= 0) {
          const newMessages = [...prev];
          newMessages[optimisticIndex] = message;
          return newMessages;
        }

        if (prev.find(m => m.id === message.id)) return prev;
        
        return [...prev, message];
      });
    };

    socketService.onGroupMessage(handleNewMessage);

    return () => {
      socketService.offGroupMessage(handleNewMessage);
      socketService.off('group:deleted', handleGroupDeleted);
    };
  }, [groupId]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: newMessage.trim(),
      senderId: user?.id,
      sender: { name: user?.name || 'Me' },
      createdAt: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    socketService.emitGroupMessage({
      groupId,
      senderId: user?.id,
      content: newMessage.trim()
    });
    
    setNewMessage('');
  };

  const handleSendQuickReply = (text) => {
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: text,
      senderId: user?.id,
      sender: { name: user?.name || 'Me' },
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);
    socketService.emitGroupMessage({
      groupId,
      senderId: user?.id,
      content: text,
    });
  };

  const handleCallLeaderOrCrew = () => {
    const isLeader = user?.role === 'leader' || group?.leaderId === user?.id;
    if (!isLeader) {
      const leaderPhone = group?.leader?.phone;
      if (leaderPhone) {
        Linking.openURL(`tel:${leaderPhone}`);
      } else {
        Alert.alert(
          '📞 Call Group Leader / లీడర్‌కి కాల్',
          `Leader: ${group?.leader?.name || 'Group Leader'}\nPhone number not available directly. You can send a direct chat message!`,
          [
            { text: 'Send Message 💬', onPress: () => setActiveTab('Chat') },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } else {
      const activeMembers = (group?.members || []).filter(m => (m.phone || m.worker?.phone));
      if (activeMembers.length === 0) {
        Alert.alert('📞 Call Crew / బృందానికి కాల్', 'No crew members have phone numbers registered yet.');
        return;
      }
      if (activeMembers.length === 1) {
        const phone = activeMembers[0].phone || activeMembers[0].worker?.phone;
        Linking.openURL(`tel:${phone}`);
        return;
      }
      Alert.alert(
        '📞 Call Crew Member / సభ్యునికి కాల్',
        'Choose a member to call directly:',
        [
          ...activeMembers.slice(0, 5).map(m => ({
            text: `📞 ${m.name || m.worker?.name || 'Member'}`,
            onPress: () => Linking.openURL(`tel:${m.phone || m.worker?.phone}`),
          })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleWhatsAppInvite = () => {
    const currentGroupName = groupName || group?.name || 'మన ఎదిగో పని బృందం';
    const leaderName = group?.leader?.name || user?.name || 'గ్రూప్ లీడర్';
    const inviteText = `🌾 *ఎదిగో పని (Edhigo Pani) - గ్రూప్ ఆహ్వానం!*\n\nనమస్తే! *${leaderName}* మిమ్మల్ని "*${currentGroupName}*" వ్యవసాయ పని బృందంలో చేరడానికి ఆహ్వానిస్తున్నారు.\n\n✅ కలిసి పని చేద్దాం - ఎక్కువ సంపాదిద్దాం\n✅ రోజువారీ వేతనం నేరుగా అందుతుంది\n\nఇప్పుడే చేరండి: https://edhigo-pani.onrender.com`;
    const encoded = encodeURIComponent(inviteText);
    const waUrl = `whatsapp://send?text=${encoded}`;
    const webUrl = `https://api.whatsapp.com/send?text=${encoded}`;

    Linking.canOpenURL(waUrl)
      .then(supported => {
        if (supported) {
          Linking.openURL(waUrl);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl);
      });
  };

  const handleExitGroup = () => {
    Alert.alert(
      '🚪 Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupAPI.exitGroup(groupId);
              handleBack();
            } catch {
              Alert.alert('Error', 'Failed to leave the group. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAcceptJob = async (jobId) => {
    try {
      await groupAPI.acceptGroupJob({ groupId, jobId });
      const acceptedJob = jobs.find(j => j.id === jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      
      if (acceptedJob) {
        navigation.navigate('GroupNavigation', { job: acceptedJob, groupId });
      } else {
        alert('Job accepted successfully for the entire group!');
      }
    } catch (error) {
      console.error('Failed to accept group job', error);
      alert(error.response?.data?.error || 'Failed to accept job');
    }
  };

  const renderJobItem = ({ item }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobInfo}>
        <Text style={styles.jobType}>{item.workType}</Text>
        <Text style={styles.farmerName}>{item.farmer?.name || 'Farmer'}</Text>
        <Text style={styles.jobDetails}>
          {item.workersNeeded} workers • ₹{item.payPerDay}/day
        </Text>
      </View>
      {user?.role === 'leader' && (
        <View style={styles.jobActions}>
          <TouchableOpacity 
            style={styles.acceptBtn} 
            activeOpacity={0.8}
            onPress={() => handleAcceptJob(item.id)}
          >
            <Text style={styles.acceptBtnText}>ACCEPT FOR GROUP</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderChatItem = ({ item }) => {
    const isMe = item.senderId === user?.id;
    return (
      <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleOther]}>
        {!isMe && <Text style={styles.chatSenderName}>{item.sender?.name}</Text>}
        <Text style={[styles.chatText, isMe && styles.chatTextMe]}>{item.content}</Text>
        <Text style={[styles.chatTime, isMe && styles.chatTimeMe]}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.backgroundDark} />
        </TouchableOpacity>
        
        <View style={styles.headerTitles}>
          <Text style={styles.headerGroup} numberOfLines={1}>{groupName || group?.name || 'Group'}</Text>
          <Text style={styles.headerSub}>
            {((group?.members?.length || 0) + 1)} Members • {group?.status === 'available' ? '🟢 Online' : '⚪ Forming'}
          </Text>
        </View>

        {user?.role === 'leader' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('GroupMap', { groupId, workerCount: ((group?.members?.length || 0) + 1) })}
              testID="group-map-btn"
            >
              <MaterialIcons name="map" size={24} color={colors.backgroundDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('ManageGroup', { groupId, groupName: group?.name })}
            >
              <MaterialIcons name="settings" size={24} color={colors.backgroundDark} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('GroupMap', { groupId, workerCount: ((group?.members?.length || 0) + 1) })}
              testID="group-map-btn"
            >
              <MaterialIcons name="map" size={24} color={colors.backgroundDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, styles.exitBtn]}
              onPress={handleExitGroup}
            >
              <MaterialIcons name="exit-to-app" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── High-Affordance Action Bar for Easy Leader Call, Messages & WhatsApp ── */}
      <View style={styles.quickBarContainer}>
        {/* Call Button */}
        <TouchableOpacity
          style={styles.quickActionBtnCall}
          onPress={handleCallLeaderOrCrew}
          activeOpacity={0.85}
        >
          <View style={styles.quickIconCircleGreen}>
            <MaterialIcons name="call" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.quickBtnTextCol}>
            <Text style={styles.quickBtnTitle}>
              {user?.role === 'leader' ? 'CALL CREW' : 'CALL LEADER'}
            </Text>
            <Text style={styles.quickBtnSub}>
              {user?.role === 'leader' ? 'బృందానికి కాల్' : 'లీడర్‌కి కాల్'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Message / Chat Button */}
        <TouchableOpacity
          style={[styles.quickActionBtnChat, activeTab === 'Chat' && styles.quickActionBtnChatActive]}
          onPress={() => setActiveTab('Chat')}
          activeOpacity={0.85}
        >
          <View style={styles.quickIconCircleBlue}>
            <MaterialIcons name="chat" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.quickBtnTextCol}>
            <Text style={styles.quickBtnTitle}>MESSAGES</Text>
            <Text style={styles.quickBtnSub}>మెసేజ్‌లు</Text>
          </View>
        </TouchableOpacity>

        {/* WhatsApp Direct Invite Button */}
        <TouchableOpacity
          style={styles.quickActionBtnWA}
          onPress={handleWhatsAppInvite}
          activeOpacity={0.85}
        >
          <View style={styles.quickIconCircleWA}>
            <MaterialIcons name="share" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.quickBtnTextCol}>
            <Text style={styles.quickBtnTitle}>WHATSAPP</Text>
            <Text style={styles.quickBtnSub}>వాట్సాప్ ఆహ్వానం</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Jobs' && styles.activeTab]} 
          onPress={() => setActiveTab('Jobs')}
        >
          <MaterialIcons name="work-outline" size={20} color={activeTab === 'Jobs' ? colors.primary : '#9CA3AF'} />
          <Text style={[styles.tabText, activeTab === 'Jobs' && styles.activeTabText]}>
            Jobs / పనులు
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Chat' && styles.activeTab]} 
          onPress={() => setActiveTab('Chat')}
        >
          <MaterialIcons name="chat-bubble-outline" size={20} color={activeTab === 'Chat' ? colors.primary : '#9CA3AF'} />
          <Text style={[styles.tabText, activeTab === 'Chat' && styles.activeTabText]}>
            Crew Chat / చర్చ
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {activeTab === 'Jobs' ? (
          jobsLoading ? (
            <CustomLoader size={48} color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={jobs}
              keyExtractor={(item) => item.id}
              renderItem={renderJobItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialIcons name="inbox" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No jobs assigned to this group yet.</Text>
                  <Text style={styles.emptySubText}>The leader will receive offers when farmers request bulk workers.</Text>
                </View>
              }
            />
          )
        ) : (
          <View style={styles.chatContainer}>
            {/* Full Screen Chat Launch Banner */}
            <TouchableOpacity
              style={styles.fullChatBanner}
              onPress={() => navigation.navigate('GroupChat', { groupId, groupName: groupName || group?.name })}
              activeOpacity={0.85}
            >
              <MaterialIcons name="open-in-full" size={18} color={colors.primary} />
              <Text style={styles.fullChatBannerText}>Open Full Screen Chat (పూర్తి స్క్రీన్)</Text>
              <MaterialIcons name="arrow-forward" size={18} color={colors.primary} />
            </TouchableOpacity>

            {chatLoading && messages.length === 0 ? (
              <CustomLoader size={48} color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderChatItem}
                contentContainerStyle={styles.chatListContent}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Start the conversation with your crew.</Text>
                    <Text style={styles.emptySubText}>Use the quick buttons below for one-tap replies!</Text>
                  </View>
                }
              />
            )}

            {/* Quick Pill Buttons for Uneducated People */}
            <View style={styles.quickRepliesSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRepliesScroll}>
                {QUICK_REPLIES.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickReplyPill}
                    onPress={() => handleSendQuickReply(item.text)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quickReplyText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.chatInputContainer}>
              <TouchableOpacity style={styles.attachBtn} onPress={handleCallLeaderOrCrew}>
                <MaterialIcons name="phone" size={24} color="#16A34A" />
              </TouchableOpacity>
              <TextInput
                style={styles.chatInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Message crew / సందేశం..."
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <MaterialIcons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerGroup: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  // ── Quick Bar ─────────────────────────────────
  quickBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quickActionBtnCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#16A34A',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  quickActionBtnChat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  quickActionBtnChatActive: {
    backgroundColor: '#DBEAFE',
  },
  quickActionBtnWA: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#25D366',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  quickIconCircleGreen: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickIconCircleBlue: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickIconCircleWA: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBtnTextCol: {
    flex: 1,
  },
  quickBtnTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
  },
  quickBtnSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 1,
  },
  // ── Tabs ──────────────────────────────────────
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: colors.primary,
  },
  contentArea: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  jobInfo: {
    marginBottom: 16,
  },
  jobType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  farmerName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  jobDetails: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
  },
  jobActions: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 6,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  fullChatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: `${colors.primary}12`,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.primary}25`,
  },
  fullChatBannerText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
  },
  chatListContent: {
    padding: 16,
    paddingBottom: 20,
  },
  chatBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  chatBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  chatBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
  },
  chatSenderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 4,
  },
  chatText: {
    fontSize: 15,
    color: '#111827',
  },
  chatTextMe: {
    color: '#FFF',
  },
  chatTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  quickRepliesSection: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quickRepliesScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickReplyPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickReplyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  attachBtn: {
    padding: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
});

export default GroupDetailScreen;
