import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
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
      setGroups(response?.data?.groups || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const renderGroupItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id, groupName: item.name })}
        activeOpacity={0.8}
      >
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.groupPhoto} />
        ) : (
          <View style={styles.groupPhotoPlaceholder}>
            <MaterialIcons name="groups" size={32} color={colors.primary} />
          </View>
        )}
        
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>{item.type || 'General Work'}</Text>
          </View>
          <Text style={styles.memberCount}>
            {item.members?.length || 0} Members
          </Text>
        </View>

        <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TopBar title="My Groups" navigation={navigation} showBack />
      
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>Your Crews</Text>
        <Text style={styles.headerSubtitle}>Manage all your working groups</Text>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#131811',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6f8961',
    marginTop: 4,
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Space for FAB
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  groupPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  groupPhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#131811',
    marginBottom: 4,
  },
  typeTag: {
    backgroundColor: colors.secondary + '20', // Yellow tint
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
    fontSize: 14,
    color: '#6f8961',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
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
