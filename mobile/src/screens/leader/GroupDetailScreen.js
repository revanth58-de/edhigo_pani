import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { groupAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { socketService } from '../../services/socketService';

const GroupDetailScreen = ({ route, navigation }) => {
  const { groupId, groupName } = route.params;
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('Jobs'); // 'Jobs' | 'Chat'
  
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setGroup(res.data.group || res.data);
    } catch (error) {
      console.warn('Failed to fetch group details:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const fetchJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const res = await groupAPI.getGroupJobs(groupId);
      setJobs(res.data.jobs || res.data || []);
    } catch (error) {
      console.warn('Failed to fetch group jobs', error);
    } finally {
      setJobsLoading(false);
    }
  }, [groupId]);

  const fetchChat = useCallback(async () => {
    try {
      setChatLoading(true);
      const res = await groupAPI.getGroupMessages(groupId);
      setMessages(res.data.messages || res.data || []);
    } catch (error) {
      console.warn('Failed to fetch chat messages', error);
    } finally {
      setChatLoading(false);
    }
  }, [groupId]);

  const loadTabContent = useCallback(() => {
    if (activeTab === 'Jobs') {
      fetchJobs();
    } else if (activeTab === 'Chat') {
      fetchChat();
    }
  }, [activeTab, fetchJobs, fetchChat]);

  useFocusEffect(
    useCallback(() => {
      fetchGroupDetails();
      loadTabContent();
    }, [fetchGroupDetails, loadTabContent])
  );

  // Handle real-time incoming messages
  useEffect(() => {
    socketService.joinGroupRoom(groupId);

    // Listen for group deletion by leader
    const handleGroupDeleted = () => {
      Alert.alert('Group Dissolved', 'The leader has deleted this group.');
      navigation.goBack();
    };
    if (socketService.socket) socketService.socket.on('group:deleted', handleGroupDeleted);

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
      if (socketService.socket) socketService.socket.off('group:deleted', handleGroupDeleted);
    };
  }, [groupId]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    // Optimistic UI update for immediate feedback
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: newMessage.trim(),
      senderId: user?.id,
      sender: { name: user?.name || 'Me' },
      createdAt: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    // Emit through socket
    socketService.emitGroupMessage({
      groupId,
      senderId: user?.id,
      content: newMessage.trim()
    });
    
    setNewMessage('');
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
              navigation.goBack();
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
      
      // Find the job to pass it to the navigation screen
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
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.backgroundDark} />
        </TouchableOpacity>
        
        <View style={styles.headerTitles}>
          <Text style={styles.headerGroup} numberOfLines={1}>{groupName || group?.name || 'Group'}</Text>
          <Text style={styles.headerSub}>
            {group?.members?.length || 0} Members • {group?.status === 'available' ? '🟢 Online' : '⚪ Forming'}
          </Text>
        </View>

        {/* Show settings (manage) for leader, exit button for members */}
        {user?.role === 'leader' ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('ManageGroup', { groupId, groupName: group?.name })}
          >
            <MaterialIcons name="settings" size={24} color={colors.backgroundDark} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.iconBtn, styles.exitBtn]}
            onPress={handleExitGroup}
          >
            <MaterialIcons name="exit-to-app" size={24} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Jobs' && styles.activeTab]} 
          onPress={() => setActiveTab('Jobs')}
        >
          <MaterialIcons name="work-outline" size={20} color={activeTab === 'Jobs' ? colors.primary : '#9CA3AF'} />
          <Text style={[styles.tabText, activeTab === 'Jobs' && styles.activeTabText]}>Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Chat' && styles.activeTab]} 
          onPress={() => setActiveTab('Chat')}
        >
          <MaterialIcons name="chat-bubble-outline" size={20} color={activeTab === 'Chat' ? colors.primary : '#9CA3AF'} />
          <Text style={[styles.tabText, activeTab === 'Chat' && styles.activeTabText]}>Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {activeTab === 'Jobs' ? (
          jobsLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
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
                </View>
              }
            />
          )
        ) : (
          <View style={styles.chatContainer}>
            {chatLoading && messages.length === 0 ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderChatItem}
                contentContainerStyle={styles.chatListContent}
                inverted={false} // Would normally sort by latest, but REST is chronological
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Start the conversation with your crew.</Text>
                  </View>
                }
              />
            )}
            
            <View style={styles.chatInputContainer}>
              <TouchableOpacity style={styles.attachBtn}>
                <MaterialIcons name="add-circle" size={24} color="#9CA3AF" />
              </TouchableOpacity>
              <TextInput
                style={styles.chatInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Message crew..."
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
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
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
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#9CA3AF',
  },
  chatContainer: {
    flex: 1,
    justifyContent: 'space-between',
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
