import React, { useState } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import GlassCard from '../../components/GlassCard';

const { width } = Dimensions.get('window');

const MachineryBookingScreen = ({ navigation, route }) => {
  const { machineType = 'Tractor' } = route.params || {};
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState('Morning');

  const slots = ['Morning (6 AM - 12 PM)', 'Afternoon (12 PM - 6 PM)', 'Full Day'];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book {machineType}</Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      {/* FIX #11: Coming Soon banner — machinery booking has no backend yet */}
      <View style={styles.comingSoonBanner}>
        <MaterialIcons name="construction" size={16} color="#92400E" />
        <Text style={styles.comingSoonText}>  Machinery booking is coming soon — preview only</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.machineImageCard}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=800' }} 
            style={styles.machineImage} 
          />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.imageOverlay}>
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>₹800/hour</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <GlassCard intensity={10} style={styles.calendarPlaceholder}>
            <MaterialIcons name="calendar-today" size={32} color={colors.primary} />
            <Text style={styles.dateText}>{selectedDate.toDateString()}</Text>
            <TouchableOpacity style={styles.changeBtn}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </GlassCard>

          <Text style={styles.sectionTitle}>Select Time Slot</Text>
          <View style={styles.slotsGrid}>
            {slots.map(slot => (
              <TouchableOpacity 
                key={slot}
                style={[styles.slotItem, selectedSlot === slot && styles.activeSlot]}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text style={[styles.slotText, selectedSlot === slot && styles.activeSlotText]}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Owner Details</Text>
          <GlassCard intensity={10} style={styles.ownerCard}>
            <View style={styles.ownerAvatar}>
              <MaterialIcons name="person" size={24} color={colors.primary} />
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>Ramesh Kumar</Text>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={16} color={colors.accent} />
                <Text style={styles.ratingText}>4.9 (124 bookings)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <MaterialIcons name="call" size={20} color="#FFF" />
            </TouchableOpacity>
          </GlassCard>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Estimated Total</Text>
          <Text style={styles.totalValue}>₹2,400</Text>
        </View>
        <TouchableOpacity 
          style={styles.bookBtn}
          onPress={() => {
            Alert.alert(
              '🚧 Coming Soon',
              'Machinery booking is not yet available. We are working on it and will notify you when it launches!',
              [{ text: 'OK', style: 'default' }]
            );
          }}
        >
          <LinearGradient colors={['#94A3B8', '#64748B']} style={styles.bookBtnGradient}>
            <Text style={styles.bookBtnText}>Coming Soon</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  comingSoonBanner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
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
  calendarPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  changeBtnText: {
    fontSize: 14,
    fontWeight: '800',
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
