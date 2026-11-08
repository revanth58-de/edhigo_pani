import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Alert,
  TextInput,
  Image,
  Platform,
  Linking,
} from 'react-native';
import CustomLoader from '../../components/CustomLoader';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { groupAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const AddMemberScreen = ({ navigation, route }) => {
  const { groupId, groupName } = route?.params || {};
  const [workers, setWorkers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('LeaderHome');
    }
  };

  const fetchNearbyWorkers = useCallback(async () => {
    try {
      const response = await groupAPI.getNearbyWorkers(); 
      setWorkers(response?.data?.workers || []);
    } catch (error) {
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

  const handleWhatsAppGeneralInvite = () => {
    const leaderName = useAuthStore.getState().user?.name || 'గ్రూప్ లీడర్';
    const text = `🌾 *ఎదిగో పని (Edhigo Pani) - గ్రూప్ ఆహ్వానం!*\n\nనమస్తే! *${leaderName}* మిమ్మల్ని "*${groupName || 'మా వ్యవసాయ బృందం'}*" గ్రూప్‌లో చేరడానికి ఆహ్వానిస్తున్నారు.\n\n✅ కలిసి పని చేద్దాం - ఎక్కువ సంపాదిద్దాం\n✅ రోజువారీ వేతనం నేరుగా అందుతుంది\n\nఇప్పుడే చేరండి: https://edhigo-pani.onrender.com`;
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

  const handleWhatsAppWorker = (worker) => {
    const leaderName = useAuthStore.getState().user?.name || 'గ్రూప్ లీడర్';
    const text = `నమస్తే ${worker.name || 'మిత్రమా'}! నేను ${leaderName}. మన "${groupName || 'ఎదిగో పని'}" వ్యవసాయ బృందంలో మిమ్మల్ని చేర్చుకోవాలనుకుంటున్నాను. ఆసక్తి ఉందా? 🌾\n\nhttps://edhigo-pani.onrender.com`;
    const encoded = encodeURIComponent(text);
    const phoneClean = worker.phone ? worker.phone.replace(/[^0-9]/g, '') : '';
    const phoneParam = phoneClean ? `phone=${phoneClean}&` : '';
    const waUrl = `whatsapp://send?${phoneParam}text=${encoded}`;
    const webUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encoded}`;

    Linking.canOpenURL(waUrl)
      .then(supported => {
        if (supported) Linking.openURL(waUrl);
        else Linking.openURL(webUrl);
      })
      .catch(() => Linking.openURL(webUrl));
  };

  const handleCallWorker = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Phone Unavailable', 'This worker has not listed a public phone number.');
    }
  };

  const handleAddMembers = async () => {
    if (selectedWorkers.length === 0) return;
    
    setAdding(true);
    let successCount = 0;
    
    try {
      for (const workerId of selectedWorkers) {
        try {
          await groupAPI.addMember(groupId, { workerId, role: 'Member' });
          successCount++;
        } catch (err) {
          // Individual add failure — continue with next worker
        }
      }

      if (successCount > 0) {
        Alert.alert('Success', `Successfully added ${successCount} member(s) to ${groupName || 'the group'}.`);
        handleBack();
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
      <View style={[styles.workerCard, isSelected && styles.workerCardSelected]}>
        <TouchableOpacity 
          style={styles.workerSelectArea}
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
            <View style={styles.nameRow}>
              <Text style={styles.workerName}>{item.name}</Text>
              {item.ratingAvg > 0 && (
                <View style={styles.ratingBadge}>
                  <MaterialIcons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{item.ratingAvg.toFixed(1)}</Text>
                </View>
              )}
            </View>
            <View style={styles.skillsRow}>
               {item.skills ? (
                  (() => {
                    let parsedSkills = [];
                    try {
                      if (Array.isArray(item.skills)) {
                        parsedSkills = item.skills;
                      } else {
                        const p = JSON.parse(item.skills || '[]');
                        parsedSkills = Array.isArray(p) ? p : [String(p)];
                      }
                    } catch (e) {
                      parsedSkills = typeof item.skills === 'string' ? item.skills.split(',').map(s => s.trim()).filter(Boolean) : [item.skills];
                    }
                    
                    return parsedSkills.slice(0, 2).map((skill, index) => (
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

        {/* Quick Action Icons: Direct WhatsApp & Phone Call for Uneducated Users */}
        <View style={styles.workerActionRow}>
          <TouchableOpacity
            style={styles.actionBtnWA}
            onPress={() => handleWhatsAppWorker(item)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="share" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnWAText}>WHATSAPP</Text>
          </TouchableOpacity>

          {item.phone ? (
            <TouchableOpacity
              style={styles.actionBtnCall}
              onPress={() => handleCallWorker(item.phone)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnCallText}>CALL</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Members / సభ్యులను చేర్చండి</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* ── WhatsApp Direct Invite Banner ── */}
      <View style={styles.bannerContainer}>
        <TouchableOpacity
          style={styles.whatsappBanner}
          onPress={handleWhatsAppGeneralInvite}
          activeOpacity={0.88}
        >
          <View style={styles.waIconBox}>
            <MaterialIcons name="share" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.waBannerTextCol}>
            <Text style={styles.waBannerTitle}>వాట్సాప్ ద్వారా ఆహ్వానించండి</Text>
            <Text style={styles.waBannerSub}>Invite by WhatsApp to "{groupName || 'Group'}" with 1 tap</Text>
          </View>
          <View style={styles.waArrowCircle}>
            <MaterialIcons name="arrow-forward" size={18} color="#25D366" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={24} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search nearby workers / వర్కర్ల శోధన..."
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
        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <CustomLoader size={48} color={colors.primary} />
        </View>
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
              <Text style={styles.emptySubText}>Use the WhatsApp button above to invite any contact directly!</Text>
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
            <CustomLoader size={24} color={colors.backgroundDark} />
          ) : (
            <>
              <MaterialIcons name="group-add" size={24} color={colors.backgroundDark} />
              <Text style={styles.addButtonText}>
                {selectedWorkers.length > 0 
                  ? `Add ${selectedWorkers.length} Workers (${selectedWorkers.length} మందిని చేర్చండి)` 
                  : 'Select Workers to Add'}
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
    paddingTop: Platform.OS === 'ios' ? 48 : Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  // ── WhatsApp Banner ─────────────────────────
  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  whatsappBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    gap: 12,
  },
  waIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waBannerTextCol: {
    flex: 1,
  },
  waBannerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  waBannerSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  waArrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Search Bar ──────────────────────────────
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
    fontSize: 15,
    color: '#111827',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  workerCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
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
  workerSelectArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  workerPhoto: {
    width: '100%',
    height: '100%',
  },
  workerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
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
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  workerActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    justifyContent: 'flex-end',
  },
  actionBtnWA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  actionBtnWAText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  actionBtnCall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  actionBtnCallText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
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
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },
});

export default AddMemberScreen;
