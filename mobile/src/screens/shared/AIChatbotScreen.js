import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import GlassCard from '../../components/GlassCard';

const AIChatbotScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Namaste! I am your Dinasari AI Assistant. How can I help you today?", sender: 'ai' },
  ]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef();

  const handleSend = () => {
    if (inputText.trim() === '') return;

    const capturedInput = inputText;
    const userMessage = { id: Date.now(), text: capturedInput, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = { 
        id: Date.now() + 1, 
        text: getAIResponse(capturedInput), 
        sender: 'ai' 
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const getAIResponse = (text) => {
    const input = text.toLowerCase();
    if (input.includes('weather')) return "The weather in your village is ideal for sowing. Expect light showers in the evening.";
    if (input.includes('price') || input.includes('mandi')) return "Today's Mandi price for Wheat is ₹2,125/quintal, up by 2.4% from yesterday.";
    if (input.includes('labour') || input.includes('worker')) return "I found 12 available workers near you specializing in Harvesting. Would you like to hire them?";
    if (input.includes('tractor')) return "Tractor rentals are currently available starting from ₹800/hour. I can book one for you.";
    return "That's interesting! I can help you with crop advice, hiring labour, or booking machinery. What would you like to know more about?";
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Dinasari AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Online Assistant</Text>
            </View>
          </View>
          <TouchableOpacity>
            <MaterialIcons name="more-vert" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View 
            key={msg.id} 
            style={[
              styles.messageWrapper, 
              msg.sender === 'user' ? styles.userWrapper : styles.aiWrapper
            ]}
          >
            {msg.sender === 'ai' && (
              <View style={styles.aiAvatar}>
                <MaterialIcons name="psychology" size={20} color="#FFF" />
              </View>
            )}
            <GlassCard 
              intensity={msg.sender === 'user' ? 0 : 20} 
              style={[
                styles.messageCard,
                msg.sender === 'user' ? styles.userCard : styles.aiCard
              ]}
            >
              <Text style={[
                styles.messageText,
                msg.sender === 'user' ? styles.userText : styles.aiText
              ]}>
                {msg.text}
              </Text>
            </GlassCard>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputArea}>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Type your question..."
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.micBtn}>
            <MaterialIcons name="mic" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <LinearGradient colors={colors.primaryGradient} style={styles.sendBtnGradient}>
            <MaterialIcons name="send" size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    gap: 16,
  },
  messageWrapper: {
    flexDirection: 'row',
    maxWidth: '85%',
    alignItems: 'flex-end',
    gap: 8,
  },
  userWrapper: {
    alignSelf: 'flex-end',
  },
  aiWrapper: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  aiCard: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userCard: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  aiText: {
    color: '#1E293B',
  },
  userText: {
    color: '#FFF',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
  },
  micBtn: {
    padding: 8,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AIChatbotScreen;
