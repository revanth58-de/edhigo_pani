import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { groupAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const AddMemberScreen = ({ navigation, route }) => {
  const { groupId, groupName } = route.params;
  const [workers, setWorkers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchNearbyWorkers = useCallback(async () => {
    try {
      // In a real app we'd fetch actual location but we'll let the backend use the leader's location
      const response = await groupAPI.getNearbyWorkers(); 
      setWorkers(response?.data?.workers || []);
    } catch (error) {
      console.error('Failed to fetch nearby workers:', error);
      Alert.alert('Error', 'Could not fetch nearby workers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNearbyWorkers();
  }, [fetchNearbyWorkers]);

  const toggleSelection = (workerId) => {
    setSelectedWorkers(prev => {
      if (prev.includes(workerId)) {
        return prev.filter(id => id !== workerId);
      } else {
        return [...prev, workerId];
      }
    });
  };

  const handleAddMembers = async () => {
    if (selectedWorkers.length === 0) return;
    
    setAdding(true);
    let successCount = 0;
    
    try {
      // Add each selected worker. In a real app, you might want an array endpoint for a single bulk request.
      for (const workerId of selectedWorkers) {
        try {
          // Add by ID since we already have the worker ID from the backend search
          await groupAPI.addMember(groupId, { workerId, role: 'Member' });
          successCount++;
        } catch (err) {
          console.warn(`Failed to add worker ${workerId}`, err.message);
          console.warn(`Error response:`, err.response?.data);
        }
      }

      if (successCount > 0) {
        Alert.alert('Success', `Successfully added ${successCount} member(s) to ${groupName || 'the group'}.`);
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to add members. They might already be in the group.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setAdding(false);
    }
  };

  const filteredWorkers = workers.filter(w => {
    const q = searchQuery.toLowerCase();
    const nameMatch = w.name?.toLowerCase().includes(q);
    
    // skills can be a string (JSON) or an array
    let skillsStr = '';
    if (w.skills) {
      if (Array.isArray(w.skills)) {
        skillsStr = w.skills.join(' ').toLowerCase();
      } else {
        skillsStr = w.skills.toLowerCase();
      }
    }
    
    return nameMatch || skillsStr.includes(q);
  });

  const renderWorker = ({ item }) => {
    const isSelected = selectedWorkers.includes(item.id);

    return (
      <TouchableOpacity 
        style={[styles.workerCard, isSelected && styles.workerCardSelected]} 
        onPress={() => toggleSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.workerPhotoPlaceholder}>
          {item.photoUrl ? (
             <Image source={{ uri: item.photoUrl }} style={styles.workerPhoto} />
          ) : (
            <MaterialIcons name="person" size={24} color={colors.primary} />
          )}
        </View>

        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>{item.name}</Text>
          <View style={styles.skillsRow}>
             {item.skills ? (
                (() => {
                  let parsedSkills = [];
                  try {
                    parsedSkills = Array.isArray(item.skills) ? item.skills : JSON.parse(item.skills || '[]');
                  } catch (e) {
                    parsedSkills = [item.skills]; // fallback if it's just a raw string
                  }
                  
                  return parsedSkills.slice(0, 3).map((skill, index) => (
                    <View key={index} style={styles.skillChip}>
                      <Text style={styles.skillText} numberOfLines={1}>{skill}</Text>
                    </View>
                  ));
                })()
             ) : (
                <View style={styles.skillChip}>
                    <Text style={styles.skillText}>General Labour</Text>
                </View>
             )}
          </View>
          <Text style={styles.distanceText}>
            <MaterialIcons name="location-on" size={12} color="#9CA3AF" /> {item.distanceStr || 'Nearby'}
          </Text>
        </View>

        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <MaterialIcons name="check" size={16} color="#FFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Members</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={24} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search nearby workers..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredWorkers}
          keyExtractor={(item) => item.id}
          renderItem={renderWorker}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="search-off" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No workers found nearby.</Text>
            </View>
          }
        />
      )}

      {/* Fixed Bottom Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.addButton, 
            (selectedWorkers.length === 0 || adding) && styles.addButtonDisabled
          ]}
          onPress={handleAddMembers}
          disabled={selectedWorkers.length === 0 || adding}
          activeOpacity={0.9}
        >
          {adding ? (
            <ActivityIndicator color={colors.backgroundDark} />
          ) : (
            <>
              <MaterialIcons name="group-add" size={24} color={colors.backgroundDark} />
              <Text style={styles.addButtonText}>
                {selectedWorkers.length > 0 
                  ? `Add ${selectedWorkers.length} Workers` 
                  : 'Select Workers'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#111827' },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Space for footer
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  workerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  workerPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  workerPhoto: {
    width: '100%',
    height: '100%',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  skillChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  skillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  distanceText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  addButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },
});

export default AddMemberScreen;
