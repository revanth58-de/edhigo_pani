/**
 * GroupChatScreen — In-app group text chat
 * Backend: GroupMessage model + socket events are already live.
 * Flow: GroupDetail → GroupChat
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, shadows, borderRadius } from '../../theme/colors';
import useAuthStore from '../../store/authStore';
import { socketService } from '../../services/socketService';
import { API_BASE_URL } from '../../config/api.config';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const formatDateDivider = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Message Bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isOwn }) => (
  <View style={[styles.bubbleWrapper, isOwn ? styles.bubbleWrapperOwn : styles.bubbleWrapperOther]}>
    {!isOwn && (
      <View style={styles.avatarCircle}>
        {message.sender?.photoUrl ? (
          <Image source={{ uri: message.sender.photoUrl }} style={styles.avatarImg} />
        ) : (
          <MaterialIcons name="person" size={18} color={colors.white} />
        )}
      </View>
    )}
    <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
      {!isOwn && (
        <Text style={styles.senderName}>{message.sender?.name || 'Member'}</Text>
      )}
      <Text style={[styles.messageText, isOwn && { color: colors.white }]}>
        {message.content}
      </Text>
      <Text style={[styles.timeText, isOwn && { color: 'rgba(255,255,255,0.7)' }]}>
        {formatTime(message.createdAt)}
      </Text>
    </View>
  </View>
);

// ── Date Divider ──────────────────────────────────────────────────────────────
const DateDivider = ({ date }) => (
  <View style={styles.dividerRow}>
    <View style={styles.dividerLine} />
    <Text style={styles.dividerText}>{date}</Text>
    <View style={styles.dividerLine} />
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const GroupChatScreen = ({ navigation, route }) => {
  const { groupId, groupName } = route.params || {};
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  // ── Load message history from REST ─────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!groupId) return;
    try {
      // Read access token from the correct SecureStore key used by authStore
      const accessToken = await SecureStore.getItemAsync('edhigo_access_token');
      const res = await axios.get(`${API_BASE_URL}/chats/${groupId}/messages`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const msgs = res?.data?.data || [];
      setMessages(msgs);
    } catch (e) {
      console.warn('Failed to load group messages:', e?.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadMessages();

    // Join group socket room
    socketService.joinGroupRoom(groupId);

    // Listen for incoming messages
    const handleMessage = (msg) => {
      setMessages((prev) => {
        // Deduplicate by database id
        if (prev.some((m) => m.id === msg.id)) return prev;

        // If it's our own message, replace the optimistic placeholder
        if (msg.sender?.id === user?.id) {
            const pendingIndex = prev.findIndex(m => m._pending && m.content === msg.content);
            if (pendingIndex !== -1) {
                const newMessages = [...prev];
                newMessages[pendingIndex] = msg;
                return newMessages;
            }
        }

        return [...prev, msg];
      });
      // Auto-scroll to bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };
    socketService.onGroupMessage(handleMessage);

    return () => {
      socketService.offGroupMessage(handleMessage);
    };
  }, [groupId, loadMessages]);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');

    // Optimistic message (shown immediately)
    const optimistic = {
      id: `temp-${Date.now()}`,
      content: text,
      createdAt: new Date().toISOString(),
      sender: { id: user?.id, name: user?.name, photoUrl: user?.photoUrl },
      _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Emit via socket
    socketService.emitGroupMessage({ groupId, content: text });
    setSending(false);
  };

  // ── Render items with date dividers ────────────────────────────────────────
  const renderItem = useCallback(({ item, index }) => {
    const isOwn = item.sender?.id === user?.id;
    const showDivider =
      index === 0 ||
      formatDateDivider(item.createdAt) !==
        formatDateDivider(messages[index - 1]?.createdAt);

    return (
      <>
        {showDivider && <DateDivider date={formatDateDivider(item.createdAt)} />}
        <MessageBubble message={item} isOwn={isOwn} />
      </>
    );
  }, [messages, user?.id]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.groupIconCircle}>
            <MaterialIcons name="groups" size={22} color={colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>{groupName || 'Group Chat'}</Text>
            <Text style={styles.headerSubtitle}>Group · Tap to view members</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <MaterialIcons name="more-vert" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading messages…</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialIcons name="chat-bubble-outline" size={64} color={colors.gray200} />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to say hello! 👋</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message…"
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <MaterialIcons name="send" size={22} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 10,
    ...shadows.md,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  headerAction: { padding: 4 },

  // ── Loading / Empty ──
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  emptyBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.gray500 },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

  // ── Messages ──
  messagesList: { padding: 12, paddingBottom: 8 },

  bubbleWrapper: { flexDirection: 'row', marginBottom: 6, gap: 8 },
  bubbleWrapperOwn: { justifyContent: 'flex-end' },
  bubbleWrapperOther: { justifyContent: 'flex-start' },

  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-end',
  },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },

  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    ...shadows.sm,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 3,
  },
  messageText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  timeText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },

  // ── Date divider ──
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.gray200 },
  dividerText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },

  // ── Input ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.md,
  },
  sendBtnDisabled: { backgroundColor: colors.gray200 },
});

export default GroupChatScreen;
