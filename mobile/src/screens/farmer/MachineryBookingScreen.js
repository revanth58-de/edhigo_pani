import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomLoader from '../../components/CustomLoader';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import GlassCard from '../../components/GlassCard';
import useSpeech from '../../hooks/useSpeech';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import { machineryService } from '../../services/api/machineryService';

const { width } = Dimensions.get('window');

const timeSlots = [
  { labelKey: 'machinery.slots.morning', value: 'Morning', hours: 6 },
  { labelKey: 'machinery.slots.afternoon', value: 'Afternoon', hours: 6 },
  { labelKey: 'machinery.slots.fullDay', value: 'Full Day', hours: 12 },
];

const getNextDays = (count = 14) => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
};

const MachineryBookingScreen = ({ navigation, route }) => {
  const { machineType = 'Tractor' } = route.params || {};
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [listings, setListings] = useState([]);
  const [selectedListingIndex, setSelectedListingIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  const { t, language } = useTranslation();
  const { speak, stop } = useSpeech();
  const user = useAuthStore((s) => s.user);

  const [farmerLatitude, setFarmerLatitude] = useState(user?.location?.latitude || null);
  const [farmerLongitude, setFarmerLongitude] = useState(user?.location?.longitude || null);

  const loadListings = async () => {
    setLoading(true);
    try {
      let lat = user?.location?.latitude;
      let lng = user?.location?.longitude;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let timerId;
          const locationPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          const timeoutPromise = new Promise((_, reject) => {
            timerId = setTimeout(() => reject(new Error('Location timeout')), 4000);
          });
          const loc = await Promise.race([locationPromise, timeoutPromise]);
          clearTimeout(timerId);
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch (locErr) {
        console.warn('Geolocation failed, falling back to profile coordinates', locErr);
      }

      if (lat) setFarmerLatitude(lat);
      if (lng) setFarmerLongitude(lng);

      let queryType = machineType;
      if (machineType) {
        const lowerType = machineType.toLowerCase();
        if (lowerType.includes('tractor')) {
          queryType = 'Tractor';
        } else if (lowerType.includes('harvester')) {
          queryType = 'Harvester';
        } else if (lowerType.includes('drone') || lowerType.includes('spray')) {
          queryType = 'Sprayer';
        } else if (lowerType.includes('rotavator') || lowerType.includes('plough')) {
          queryType = 'Plough';
        } else if (lowerType.includes('pump')) {
          queryType = 'Pump Set';
        } else if (lowerType.includes('thresher')) {
          queryType = 'Thresher';
        }
      }

      const res = await machineryService.getMachineryListings({
        type: queryType,
        lat,
        lng,
      });

      if (res.success) {
        setListings(res.listings || []);
        setSelectedListingIndex(0);
      } else {
        console.error('Failed to load machinery listings:', res.message);
      }
    } catch (err) {
      console.error('Error in loadListings:', err);
    } finally {
      setLoading(false);
    }
  };

  const playVoiceGuide = () => {
    const text = t('machinery.bookTitle').replace('%{type}', machineType) + '. ' + t('machinery.selectDate') + ', ' + t('machinery.selectSlot');
    speak(text);
  };

  useFocusEffect(
    useCallback(() => {
      loadListings();
      playVoiceGuide();
      return () => stop();
    }, [machineType])
  );

  const handleNextListing = () => {
    if (listings.length > 1) {
      setSelectedListingIndex((prev) => (prev + 1) % listings.length);
    }
  };

  const handlePrevListing = () => {
    if (listings.length > 1) {
      setSelectedListingIndex((prev) => (prev - 1 + listings.length) % listings.length);
    }
  };

  const handleCallOwner = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleConfirmBooking = async () => {
    const currentListing = listings[selectedListingIndex];
    if (!currentListing) return;

    setBookingLoading(true);
    try {
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const slotValue = timeSlots[selectedSlotIndex].value;
      const totalAmount = currentListing.pricePerHour * timeSlots[selectedSlotIndex].hours;

      const res = await machineryService.bookMachinery({
        machineryId: currentListing.id,
        date: formattedDate,
        slot: slotValue,
        totalAmount,
        latitude: farmerLatitude,
        longitude: farmerLongitude,
        address: user?.village || 'Farmer Farm',
      });

      if (res.success) {
        const dateStr = selectedDate.toLocaleDateString(language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US', { day: 'numeric', month: 'short' });
        const successMsg = t('machinery.bookingSuccessMessage')
          .replace('%{name}', currentListing.name)
          .replace('%{date}', dateStr)
          .replace('%{slot}', t(timeSlots[selectedSlotIndex].labelKey));

        Alert.alert(
          t('machinery.bookingSuccess'),
          successMsg,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        speak(t('machinery.bookingSuccess'));
      } else {
        Alert.alert(t('common.error') || 'Error', res.message || t('machinery.errorBooking'));
        speak(res.message || t('machinery.errorBooking'));
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      Alert.alert(t('common.error') || 'Error', t('machinery.errorBooking'));
    } finally {
      setBookingLoading(false);
    }
  };

  const currentListing = listings[selectedListingIndex];
  const nextDays = getNextDays(14);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('machinery.bookTitle').replace('%{type}', machineType)}</Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderContainer}>
          <CustomLoader size={48} color={colors.primary} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <GlassCard intensity={20} style={styles.emptyCard}>
            <MaterialIcons name="info-outline" size={48} color={colors.primary} />
            <Text style={styles.emptyText}>
              {t('machinery.noListings').replace('%{type}', machineType)}
            </Text>
          </GlassCard>
        </View>
      ) : (
        <>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.machineImageCard}>
              <Image
                source={{
                  uri: currentListing.photoUrl ||
                    (machineType.toLowerCase() === 'tractor'
                      ? 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=800'
                      : 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=800'),
                }}
                style={styles.machineImage}
              />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.imageOverlay}>
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>
                    {t('machinery.pricePerHour').replace('%{price}', currentListing.pricePerHour)}
                  </Text>
                </View>
              </LinearGradient>

              {listings.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.chevronBtn, styles.leftChevron]}
                    onPress={handlePrevListing}
                  >
                    <MaterialIcons name="chevron-left" size={28} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chevronBtn, styles.rightChevron]}
                    onPress={handleNextListing}
                  >
                    <MaterialIcons name="chevron-right" size={28} color="#FFF" />
                  </TouchableOpacity>

                  <View style={styles.carouselIndicators}>
                    {listings.map((_, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.indicatorDot,
                          selectedListingIndex === idx && styles.activeIndicatorDot,
                        ]}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>{t('machinery.selectDate')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarStrip}>
                {nextDays.map((date, idx) => {
                  const isSelected = selectedDate.toDateString() === date.toDateString();
                  const dayName = date.toLocaleDateString(language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'short' });
                  const dayNum = date.getDate();
                  const monthName = date.toLocaleDateString(language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US', { month: 'short' });

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.calendarDayCard, isSelected && styles.activeDayCard]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[styles.dayNameText, isSelected && styles.activeDayText]}>{dayName}</Text>
                      <Text style={[styles.dayNumText, isSelected && styles.activeDayText]}>{dayNum}</Text>
                      <Text style={[styles.monthNameText, isSelected && styles.activeDayText]}>{monthName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.sectionTitle}>{t('machinery.selectSlot')}</Text>
              <View style={styles.slotsGrid}>
                {timeSlots.map((slot, index) => {
                  const isSelected = selectedSlotIndex === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.slotItem, isSelected && styles.activeSlot]}
                      onPress={() => setSelectedSlotIndex(index)}
                    >
                      <Text style={[styles.slotText, isSelected && styles.activeSlotText]}>
                        {t(slot.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>{t('machinery.ownerDetails')}</Text>
              <GlassCard intensity={10} style={styles.ownerCard}>
                <View style={styles.ownerAvatar}>
                  <MaterialIcons name="person" size={24} color={colors.primary} />
                </View>
                <View style={styles.ownerInfo}>
                  <Text style={styles.ownerName}>{currentListing.owner?.name || 'Owner'}</Text>
                  <View style={styles.ratingRow}>
                    <MaterialIcons name="star" size={16} color={colors.accent} />
                    <Text style={styles.ratingText}>
                      {t('machinery.ratingBookings')
                        .replace('%{rating}', currentListing.owner?.ratingAvg || '5.0')
                        .replace('%{count}', currentListing.owner?.ratingCount || '0')}
                    </Text>
                  </View>
                </View>
                {currentListing.owner?.phone && (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCallOwner(currentListing.owner.phone)}
                  >
                    <MaterialIcons name="call" size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
              </GlassCard>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('machinery.estimatedTotal')}</Text>
              <Text style={styles.totalValue}>
                ₹{(currentListing.pricePerHour * timeSlots[selectedSlotIndex].hours).toLocaleString(language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.bookBtn, bookingLoading && { opacity: 0.7 }]}
              onPress={handleConfirmBooking}
              disabled={bookingLoading}
            >
              <LinearGradient colors={colors.primaryGradient} style={styles.bookBtnGradient}>
                {bookingLoading ? (
                  <CustomLoader size={24} color="#FFF" />
                ) : (
                  <Text style={styles.bookBtnText}>{t('machinery.confirmBooking')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 24,
    gap: 16,
    width: '100%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  machineImageCard: {
    width: width,
    height: 240,
    position: 'relative',
  },
  machineImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 20,
  },
  priceTag: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  chevronBtn: {
    position: 'absolute',
    top: '40%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  leftChevron: {
    left: 16,
  },
  rightChevron: {
    right: 16,
  },
  carouselIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeIndicatorDot: {
    width: 16,
    backgroundColor: '#FFF',
  },
  infoSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 16,
    marginTop: 8,
  },
  calendarStrip: {
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  calendarDayCard: {
    width: 64,
    height: 90,
    backgroundColor: '#FFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }
    }),
  },
  activeDayCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  dayNumText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  monthNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  activeDayText: {
    color: colors.primary,
  },
  slotsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  slotItem: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeSlot: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  slotText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  activeSlotText: {
    color: colors.primary,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 24,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  totalRow: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
  },
  bookBtn: {
    flex: 1.5,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  bookBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    textTransform: 'uppercase',
  },
});

export default MachineryBookingScreen;
