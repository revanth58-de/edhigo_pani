import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useChatStore = create(
  persist(
    (set, get) => ({
      // Map of groupId -> array of messages (chronological order)
      groupMessages: {},

      setMessagesForGroup: (groupId, messages) => {
        if (!groupId) return;
        set((state) => {
          const updatedMessages = (messages || []).slice(-50);
          return {
            groupMessages: {
              ...state.groupMessages,
              [groupId]: updatedMessages,
            },
          };
        });
      },

      addMessageToGroup: (groupId, message) => {
        if (!groupId || !message) return;
        set((state) => {
          const currentMessages = state.groupMessages[groupId] || [];
          
          // Deduplicate: check by id or _id
          const exists = currentMessages.some(
            (m) => 
              (message.id && m.id === message.id) || 
              (message._id && m._id === message._id)
          );
          
          if (exists) return state;

          const updatedMessages = [...currentMessages, message].slice(-50);
          return {
            groupMessages: {
              ...state.groupMessages,
              [groupId]: updatedMessages,
            },
          };
        });
      },

      clearAll: () => set({ groupMessages: {} }),
    }),
    {
      name: 'edhigo_chat_store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useChatStore;
