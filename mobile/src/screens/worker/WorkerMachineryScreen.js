import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Platform,
  RefreshControl,
  Dimensions,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import { machineryService } from '../../services/api/machineryService';
import GlassCard from '../../components/GlassCard';
import CustomLoader from '../../components/CustomLoader';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';

const { width } = Dimensions.get('window');

const MACHINE_TYPES = [
  { value: 'Tractor', icon: 'agriculture' },
  { value: 'Harvester', icon: 'grain' },
  { value: 'Pump Set', icon: 'waves' },
  { value: 'Plough', icon: 'format-align-justify' },
  { value: 'Sprayer', icon: 'opacity' },
  { value: 'Thresher', icon: 'filter-hdr' },
];

const WorkerMachineryScreen = ({ navigation }) => {
  const { t, language } = useTranslation();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'bookings'
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Tractor');
  const [pricePerHour, setPricePerHour] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);

  const handleUpdateStatus = async (bookingId, newStatus) => {
    setUpdatingBookingId(bookingId);
    try {
      const res = await machineryService.updateBookingStatus(bookingId, newStatus);
      if (res.success) {
        Alert.alert(
          t('common.success') || 'Success',
          newStatus === 'confirmed' ? t('machinery.acceptSuccess') : t('machinery.rejectSuccess')
        );
        loadData(true);
      } else {
        Alert.alert(t('common.error'), res.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Update booking status error:', err);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [listingsRes, bookingsRes] = await Promise.all([
        machineryService.getOwnerListings(),
        machineryService.getOwnerBookings(),
      ]);

      if (listingsRes.success) {
        setListings(listingsRes.listings || []);
      }
      if (bookingsRes.success) {
        setBookings(bookingsRes.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load machinery data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const rate = parseFloat(pricePerHour);

    if (!trimmedName) {
      Alert.alert(t('common.error'), t('machinery.nameRequired'));
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      Alert.alert(t('common.error'), t('machinery.rateRequired'));
      return;
    }

    setSubmitting(true);
    let latitude = user?.latitude || null;
    let longitude = user?.longitude || null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy?.Balanced || 3 });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
    } catch (locErr) {
      console.warn('Geolocation capture failed, using defaults', locErr);
    }

    const res = await machineryService.register({
      name: trimmedName,
      type,
      pricePerHour: rate,
      latitude,
      longitude,
    });

    setSubmitting(false);

    if (res.success) {
      Alert.alert(t('common.success'), t('machinery.successRegister'));
      setName('');
      setPricePerHour('');
      setType('Tractor');
      setShowAddForm(false);
      loadData();
    } else {
      Alert.alert(t('common.error'), res.message || t('machinery.errorRegister'));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <TopBar title={t('machinery.myMachinery')} showBack={user?.role !== 'machinery'} navigation={navigation} />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'listings' && styles.activeTab]}
          onPress={() => {
            setActiveTab('listings');
            setShowAddForm(false);
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="list"
            size={18}
            color={activeTab === 'listings' ? colors.primary : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'listings' && styles.activeTabText]}>
            {t('machinery.activeListings')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
          onPress={() => {
            setActiveTab('bookings');
            setShowAddForm(false);
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="calendar-today"
            size={18}
            color={activeTab === 'bookings' ? colors.primary : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
            {t('machinery.ownerBookings')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <CustomLoader size={48} color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'listings' && (
            <>
              {/* Form Toggle Card */}
              {!showAddForm ? (
                <TouchableOpacity
                  style={styles.addTriggerBtn}
                  onPress={() => setShowAddForm(true)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={colors.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.addTriggerGradient}
                  >
                    <MaterialIcons name="add-circle-outline" size={24} color="#FFF" />
                    <Text style={styles.addTriggerText}>{t('machinery.registerNew')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <GlassCard intensity={15} style={styles.formCard}>
                  <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>{t('machinery.registerNew')}</Text>
                    <TouchableOpacity onPress={() => setShowAddForm(false)}>
                      <MaterialIcons name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>{t('machinery.machineName')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. John Deere 5050"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={styles.inputLabel}>{t('machinery.machineType')}</Text>
                  <View style={styles.typeSelectorRow}>
                    {MACHINE_TYPES.map((tItem) => {
                      const isSelected = type === tItem.value;
                      return (
                        <TouchableOpacity
                          key={tItem.value}
                          style={[styles.typeChip, isSelected && styles.activeTypeChip]}
                          onPress={() => setType(tItem.value)}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons
                            name={tItem.icon}
                            size={16}
                            color={isSelected ? '#FFF' : '#64748B'}
                          />
                          <Text style={[styles.typeChipText, isSelected && styles.activeTypeChipText]}>
                            {tItem.value}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>{t('machinery.hourlyRate')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 800"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={pricePerHour}
                    onChangeText={setPricePerHour}
                  />

                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleRegister}
                    disabled={submitting}
                  >
                    <LinearGradient
                      colors={colors.primaryGradient}
                      style={styles.submitGradient}
                    >
                      {submitting ? (
                        <CustomLoader size={24} color="#FFF" />
                      ) : (
                        <Text style={styles.submitText}>{t('machinery.registerButton')}</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </GlassCard>
              )}

              {/* Machinery List */}
              <Text style={styles.sectionTitle}>{t('machinery.activeListings')}</Text>
              {listings.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="agriculture" size={48} color="#94A3B8" />
                  <Text style={styles.emptyText}>{t('machinery.noRegistered')}</Text>
                </View>
              ) : (
                listings.map((item) => (
                  <View key={item.id} style={styles.machineCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.machineIconCircle}>
                        <MaterialIcons
                          name={
                            MACHINE_TYPES.find((m) => m.value === item.type)?.icon || 'agriculture'
                          }
                          size={24}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.machineInfo}>
                        <Text style={styles.machineName}>{item.name}</Text>
                        <Text style={styles.machineType}>{item.type}</Text>
                      </View>
                      <View style={styles.priceBadge}>
                        <Text style={styles.priceBadgeText}>
                          ₹{item.pricePerHour}/{t('machinery.slots.morning').split(' ')[0] === 'उदयं' ? 'గంట' : t('machinery.slots.morning').split(' ')[0] === 'सुबह' ? 'घंटा' : 'hr'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {activeTab === 'bookings' && (
            <>
              <Text style={styles.sectionTitle}>{t('machinery.ownerBookings')}</Text>
              {bookings.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="event-busy" size={48} color="#94A3B8" />
                  <Text style={styles.emptyText}>{t('machinery.noOwnerBookings')}</Text>
                </View>
              ) : (
                bookings.map((booking) => (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.bookingCardHeader}>
                      <View style={styles.bookingIconWrap}>
                        <MaterialIcons name="bookmark-border" size={22} color={colors.primary} />
                      </View>
                      <View style={styles.bookingMain}>
                        <Text style={styles.bookingMachineName}>{booking.machinery?.name}</Text>
                        <Text style={styles.bookingFarmerName}>
                          {t('machinery.bookedBy').replace('%{name}', booking.farmer?.name || 'Farmer')}
                        </Text>
                        {booking.farmer?.phone && (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${booking.farmer.phone}`)}
                            activeOpacity={0.7}
                            style={styles.bookingPhoneBtn}
                          >
                            <MaterialIcons name="call" size={14} color={colors.primary} />
                            <Text style={styles.bookingPhoneText}>
                              {t('machinery.phone').replace('%{phone}', booking.farmer.phone)}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.bookingAmountBadge}>
                        <Text style={styles.bookingAmountText}>₹{booking.totalAmount}</Text>
                      </View>
                    </View>

                    <View style={styles.bookingCardFooter}>
                      <View style={styles.footerDetail}>
                        <MaterialIcons name="event" size={16} color="#64748B" />
                        <Text style={styles.footerDetailText}>
                          {new Date(booking.date).toLocaleDateString(
                            language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US',
                            { day: 'numeric', month: 'short' }
                          )}
                        </Text>
                      </View>
                      <View style={styles.footerDetail}>
                        <MaterialIcons name="schedule" size={16} color="#64748B" />
                        <Text style={styles.footerDetailText}>
                          {booking.slot === 'Morning'
                            ? t('machinery.slots.morning')
                            : booking.slot === 'Afternoon'
                            ? t('machinery.slots.afternoon')
                            : t('machinery.slots.fullDay')}
                        </Text>
                      </View>
                      <View style={styles.statusBadgeWrap}>
                        <Text style={styles.statusBadgeText}>
                          {t('machinery.bookingStatus').replace('%{status}', booking.status.toUpperCase())}
                        </Text>
                      </View>
                    </View>

                    {booking.address && (
                      <View style={[styles.footerDetail, { marginTop: 12, paddingHorizontal: 4, width: '100%' }]}>
                        <MaterialIcons name="location-on" size={16} color="#64748B" />
                        <Text style={[styles.footerDetailText, { flex: 1 }]} numberOfLines={2}>
                          {booking.address}
                        </Text>
                      </View>
                    )}

                    {booking.latitude && booking.longitude && (
                      <TouchableOpacity
                        style={styles.mapLinkBtn}
                        onPress={() => {
                          const url = `https://www.google.com/maps/search/?api=1&query=${booking.latitude},${booking.longitude}`;
                          Linking.openURL(url);
                        }}
                      >
                        <MaterialIcons name="navigation" size={14} color={colors.primary} />
                        <Text style={styles.mapLinkText}>Navigate to Farm</Text>
                      </TouchableOpacity>
                    )}

                    {booking.status === 'pending' && (
                      <View style={styles.bookingActionsRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => handleUpdateStatus(booking.id, 'cancelled')}
                          disabled={updatingBookingId !== null}
                          activeOpacity={0.7}
                        >
                          {updatingBookingId === booking.id ? (
                            <CustomLoader size={24} color="#EF4444" />
                          ) : (
                            <>
                              <MaterialIcons name="close" size={18} color="#EF4444" />
                              <Text style={styles.rejectBtnText}>{t('machinery.reject')}</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.acceptBtn]}
                          onPress={() => handleUpdateStatus(booking.id, 'confirmed')}
                          disabled={updatingBookingId !== null}
                          activeOpacity={0.7}
                        >
                          {updatingBookingId === booking.id ? (
                            <CustomLoader size={24} color="#FFFFFF" />
                          ) : (
                            <>
                              <MaterialIcons name="check" size={18} color="#FFFFFF" />
                              <Text style={styles.acceptBtnText}>{t('machinery.accept')}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {booking.status === 'confirmed' && (
                      <View style={styles.bookingActionsRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.acceptBtn]}
                          onPress={() => navigation.navigate('QRScanner', {
                            job: {
                              id: booking.id,
                              workType: booking.machinery?.name || booking.machinery?.type || 'Machinery',
                              payPerDay: booking.machinery?.pricePerHour || booking.totalAmount,
                            },
                            booking,
                            isMachinery: true,
                          })}
                        >
                          <MaterialIcons name="qr-code-scanner" size={18} color="#FFFFFF" />
                          <Text style={styles.acceptBtnText}>Scan Check-In QR</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {booking.status === 'in_progress' && (
                      <View style={styles.bookingActionsRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}
                          onPress={() => navigation.navigate('WorkStatus', {
                            job: {
                              id: booking.id,
                              workType: booking.machinery?.name || booking.machinery?.type || 'Machinery',
                              payPerDay: booking.machinery?.pricePerHour || booking.totalAmount,
                            },
                            booking,
                            isMachinery: true,
                          })}
                        >
                          <MaterialIcons name="play-circle-filled" size={18} color="#FFFFFF" />
                          <Text style={styles.acceptBtnText}>View Session Progress</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {user?.role === 'machinery' && (
        <BottomNavBar role="machinery" activeTab="Home" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  activeTabText: {
    color: colors.primary,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 80,
  },
  addTriggerBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  addTriggerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  addTriggerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    height: 52,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 12,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  activeTypeChip: {
    backgroundColor: colors.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTypeChipText: {
    color: '#FFFFFF',
  },
  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  submitGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  machineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  machineIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  machineInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  machineType: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  priceBadge: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookingMain: {
    flex: 1,
  },
  bookingMachineName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  bookingFarmerName: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  bookingPhone: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 1,
  },
  bookingPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  bookingPhoneText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  bookingAmountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bookingAmountText: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '900',
  },
  bookingCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 4,
  },
  footerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerDetailText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  statusBadgeWrap: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  bookingActionsRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1.5,
  },
  rejectBtn: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  acceptBtn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  rejectBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  mapLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  mapLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default WorkerMachineryScreen;
