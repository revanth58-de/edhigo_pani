import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform,
  Image,
  Animated,
  Easing,
  LayoutAnimation,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

const CropWorkTypesScreen = ({ route, navigation }) => {
  const { cropId, cropName, cropGradient } = route.params || {
    cropId: 'paddy',
    cropName: 'Paddy',
    cropGradient: ['#2E7D32', '#1B5E20'],
  };

  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [acreage, setAcreage] = useState('2');
  const [isCalcExpanded, setIsCalcExpanded] = useState(false);
  const [calcCost, setCalcCost] = useState(null);

  // Define dynamic operations list based on crop selection
  const getOperationsForCrop = () => {
    if (cropId === 'paddy') {
      return [
        {
          id: 'landPrep',
          name: t('cropWorkTypes.paddyLandPrep') || 'Land Preparation (Ploughing)',
          skillKeyword: 'tractor',
          icon: 'agriculture',
          image: require('../../../assets/crops/paddy_landprep.jpg'),
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: Math.max(1, Math.round(1 * acres)) }),
        },
        {
          id: 'nurseryPrep',
          name: t('cropWorkTypes.nurseryPrep') || 'Nursery Preparation',
          skillKeyword: 'sowing',
          icon: 'grass',
          image: 'https://images.unsplash.com/photo-1592882199738-9271a5c68b75?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(1, Math.round(3 * acres)), duration: 1 }),
        },
        {
          id: 'transplanting',
          name: t('cropWorkTypes.transplanting') || 'Transplanting',
          skillKeyword: 'sowing',
          icon: 'spa',
          image: require('../../../assets/crops/paddy_transplanting.jpg'),
          calc: (acres) => ({ workers: Math.max(2, Math.round(5 * acres)), duration: 1 }),
        },
        {
          id: 'directSeeding',
          name: t('cropWorkTypes.directSeeding') || 'Direct Seeding',
          skillKeyword: 'sowing',
          icon: 'grain',
          image: 'https://images.pexels.com/photos/2132227/pexels-photo-2132227.jpeg?auto=compress&cs=tinysrgb&w=800',
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
        },
        {
          id: 'irrigation',
          name: t('cropWorkTypes.irrigationOrchard') || 'Irrigation',
          skillKeyword: 'labour',
          icon: 'opacity',
          image: 'https://images.unsplash.com/photo-1593113630400-ea4288922497?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(1, Math.round(1 * acres)), duration: 1 }),
        },
        {
          id: 'fertilizerApp',
          name: t('cropWorkTypes.fertilizerAppOrchard') || 'Fertilizer Application',
          skillKeyword: 'labour',
          icon: 'bubble-chart',
          image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
        },
        {
          id: 'weeding',
          name: t('cropWorkTypes.weedingOrchard') || 'Weed Removal',
          skillKeyword: 'labour',
          icon: 'filter-hdr',
          image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 1 }),
        },
        {
          id: 'spraying',
          name: t('cropWorkTypes.sprayingOrchard') || 'Pesticide Spraying',
          skillKeyword: 'labour',
          icon: 'waves',
          image: 'https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=800',
          calc: (acres) => ({ workers: Math.max(1, Math.round(1 * acres)), duration: 1 }),
        },
        {
          id: 'harvesting',
          name: t('cropWorkTypes.harvesting') || 'Harvesting',
          skillKeyword: 'harvesting',
          icon: 'grain',
          image: 'https://images.pexels.com/photos/259280/pexels-photo-259280.jpeg?auto=compress&cs=tinysrgb&w=800',
          calc: (acres) => ({ workers: Math.max(4, Math.round(8 * acres)), duration: 1 }),
        },
        {
          id: 'threshing',
          name: t('cropWorkTypes.threshing') || 'Threshing',
          skillKeyword: 'harvesting',
          icon: 'waves',
          image: 'https://images.pexels.com/photos/5928014/pexels-photo-5928014.jpeg?auto=compress&cs=tinysrgb&w=800',
          calc: (acres) => ({ workers: Math.max(2, Math.round(4 * acres)), duration: 1 }),
        },
        {
          id: 'drying',
          name: t('cropWorkTypes.drying') || 'Drying',
          skillKeyword: 'labour',
          icon: 'wb-sunny',
          image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
        },
        {
          id: 'bagFilling',
          name: t('cropWorkTypes.bagFilling') || 'Bag Filling',
          skillKeyword: 'labour',
          icon: 'shopping-bag',
          image: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
        },
        {
          id: 'loading',
          name: t('cropWorkTypes.loadingOrchard') || 'Loading',
          skillKeyword: 'labour',
          icon: 'local-shipping',
          image: 'https://images.unsplash.com/photo-1588710922810-ee8a11516e88?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 1 }),
        },
      ];
    }

    // Default Fruit / Orchard / General List
    return [
      {
        id: 'landPrepOrchard',
        name: t('cropWorkTypes.landPrepOrchard') || 'Land Preparation',
        skillKeyword: 'tractor',
        icon: 'agriculture',
        image: require('../../../assets/crops/orchard_landprep.png'),
        calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: Math.max(1, Math.round(1 * acres)) }),
      },
      {
        id: 'pitDigging',
        name: t('cropWorkTypes.pitDigging') || 'Pit Digging',
        skillKeyword: 'labour',
        icon: 'gavel',
        image: require('../../../assets/crops/orchard_pitdigging.jpg'),
        calc: (acres) => ({ workers: Math.max(2, Math.round(4 * acres)), duration: 1 }),
      },
      {
        id: 'plantingSaplings',
        name: t('cropWorkTypes.plantingSaplings') || 'Planting Saplings',
        skillKeyword: 'sowing',
        icon: 'park',
        image: 'https://images.unsplash.com/photo-1592882199738-9271a5c68b75?q=80&w=800&auto=format&fit=crop',
        calc: (acres) => ({ workers: Math.max(1, Math.round(3 * acres)), duration: 1 }),
      },
      {
        id: 'irrigationOrchard',
        name: t('cropWorkTypes.irrigationOrchard') || 'Irrigation',
        skillKeyword: 'labour',
        icon: 'opacity',
        image: 'https://images.unsplash.com/photo-1593113630400-ea4288922497?q=80&w=800&auto=format&fit=crop',
        calc: (acres) => ({ workers: Math.max(1, Math.round(1 * acres)), duration: 1 }),
      },
      {
        id: 'fertilizerAppOrchard',
        name: t('cropWorkTypes.fertilizerAppOrchard') || 'Fertilizer Application',
        skillKeyword: 'labour',
        icon: 'bubble-chart',
        image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?q=80&w=800&auto=format&fit=crop',
        calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
      },
      {
        id: 'sprayingOrchard',
        name: t('cropWorkTypes.sprayingOrchard') || 'Pesticide Spraying',
        skillKeyword: 'labour',
        icon: 'waves',
        image: 'https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=800',
        calc: (acres) => ({ workers: Math.max(1, Math.round(1 * acres)), duration: 1 }),
      },
      {
        id: 'pruning',
        name: t('cropWorkTypes.pruning') || 'Pruning',
        skillKeyword: 'labour',
        icon: 'content-cut',
        image: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=800&auto=format&fit=crop',
        calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
      },
      {
        id: 'weedingOrchard',
        name: t('cropWorkTypes.weedingOrchard') || 'Weed Removal',
        skillKeyword: 'labour',
        icon: 'filter-hdr',
        image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=800&auto=format&fit=crop',
        calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 1 }),
      },
      {
        id: 'fruitThinning',
        name: t('cropWorkTypes.fruitThinning') || 'Fruit Thinning',
        skillKeyword: 'labour',
        icon: 'nature',
        image: 'https://images.unsplash.com/photo-1617113930975-f9c7243ae527?q=80&w=800&auto=format&fit=crop',
        calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
      },
      {
        id: 'harvestingOrchard',
        name: t('cropWorkTypes.harvestingOrchard') || 'Harvesting',
        skillKeyword: 'harvesting',
        icon: 'grain',
        image: 'https://images.pexels.com/photos/259280/pexels-photo-259280.jpeg?auto=compress&cs=tinysrgb&w=800',
        calc: (acres) => ({ workers: Math.max(3, Math.round(6 * acres)), duration: 1 }),
      },
      {
        id: 'sortingGrading',
        name: t('cropWorkTypes.sortingGrading') || 'Sorting & Grading',
        skillKeyword: 'labour',
        icon: 'sort',
        image: 'https://images.pexels.com/photos/5928014/pexels-photo-5928014.jpeg?auto=compress&cs=tinysrgb&w=800',
        calc: (acres) => ({ workers: Math.max(2, Math.round(4 * acres)), duration: 1 }),
      },
      {
        id: 'packing',
        name: t('cropWorkTypes.packing') || 'Packing',
        skillKeyword: 'labour',
        icon: 'inbox',
        image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=800&auto=format&fit=crop',
        calc: (acres) => ({ workers: Math.max(1, Math.round(3 * acres)), duration: 1 }),
      },
      {
        id: 'loadingOrchard',
        name: t('cropWorkTypes.loadingOrchard') || 'Loading',
        skillKeyword: 'labour',
        icon: 'local-shipping',
        image: 'https://images.unsplash.com/photo-1588710922810-ee8a11516e88?q=80&w=800&auto=format&fit=crop',
        calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 1 }),
      },
      {
        id: 'orchardCleaning',
        name: t('cropWorkTypes.orchardCleaning') || 'Orchard Cleaning',
        skillKeyword: 'labour',
        icon: 'cleaning-services',
        image: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=800&auto=format&fit=crop',
        calc: (acres) => ({ workers: Math.max(1, Math.round(3 * acres)), duration: 1 }),
      },
    ];
  };

  const operations = getOperationsForCrop();

  const filteredOps = operations.filter((op) =>
    op.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCalculator = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCalcExpanded(!isCalcExpanded);
  };

  const handleCalculateCost = () => {
    const acresVal = parseFloat(acreage) || 0;
    const defaultOp = operations.find(o => o.id === 'harvesting') || operations[0];
    const calcResult = defaultOp.calc(acresVal);
    // Cost estimation = workers * duration * 500
    const estimatedCost = calcResult.workers * calcResult.duration * 500;
    setCalcCost(estimatedCost);
  };

  const handleProceed = (op) => {
    const acresVal = parseFloat(acreage) || 0;
    const calculation = op.calc(acresVal);

    navigation.navigate('SelectWorkers', {
      workType: op.name,
      cropId,
      cropName,
      operationId: op.id,
      operationName: op.name,
      skillKeyword: op.skillKeyword,
      acreage: acresVal,
      workersNeeded: calculation.workers,
      durationDays: calculation.duration,
    });
  };

  // Micro-interaction button scale
  const scaleValue = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.timing(scaleValue, {
      toValue: 0.96,
      duration: 100,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleValue, {
      toValue: 1,
      duration: 150,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Immersive Green Header */}
      <LinearGradient colors={colors.primaryGradient || ['#1F8A3D', '#145A2D']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {cropName} Works
          </Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* PREMIUM COLLAPSIBLE CALCULATOR CARD */}
        <View style={styles.calculatorCard}>
          <TouchableOpacity 
            style={styles.calcHeader} 
            onPress={toggleCalculator} 
            activeOpacity={0.8}
          >
            <View style={styles.calcHeaderTitleRow}>
              <MaterialIcons name="calculate" size={24} color={colors.primary} />
              <Text style={styles.calcTitle}>Smart Labour & Cost Calculator</Text>
            </View>
            <MaterialIcons 
              name={isCalcExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={26} 
              color={colors.primary} 
            />
          </TouchableOpacity>

          {isCalcExpanded && (
            <View style={styles.calcBody}>
              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('cropWorkTypes.acreageLabel') || 'Enter Farm Size'}</Text>
                  <View style={styles.textInputWrap}>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={acreage}
                      onChangeText={(text) => setAcreage(text.replace(/[^0-9.]/g, ''))}
                      placeholder="2"
                    />
                    <Text style={styles.acresSuffix}>Acres</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.calculateBtn} 
                onPress={handleCalculateCost}
                activeOpacity={0.8}
              >
                <Text style={styles.calculateBtnText}>Calculate Estimated Cost</Text>
              </TouchableOpacity>

              {calcCost !== null && (
                <View style={styles.costDisplayCard}>
                  <Text style={styles.costLabel}>Estimated Cost (avg. rate ₹500/day)</Text>
                  <Text style={styles.costValue}>₹{calcCost.toLocaleString()}</Text>
                  <Text style={styles.costSubtext}>*Based on recommended labor for harvesting operations.</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeadline}>Select Work</Text>
          <Text style={styles.sectionSubline}>Choose a work to book nearby labour instantly</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchBarContainer}>
          <MaterialIcons name="search" size={22} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchTextInput}
            placeholder={t('cropWorkTypes.searchPlaceholder') || 'Search work types...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 2-COLUMN RESPONSIVE GRID FOR OPERATIONS */}
        <View style={styles.grid}>
          {filteredOps.map((op) => {
            const calculation = op.calc(parseFloat(acreage) || 2);
            return (
              <Animated.View key={op.id} style={styles.cardContainer}>
                <TouchableOpacity
                  style={styles.opCard}
                  onPress={() => handleProceed(op)}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardImageContainer}>
                    <Image source={typeof op.image === 'string' ? { uri: op.image } : op.image} style={styles.cardImage} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0, 0, 0, 0.75)']}
                      style={styles.cardGradient}
                    />
                    
                    {/* Floating Icon badge */}
                    <View style={styles.iconBadge}>
                      <MaterialIcons name={op.icon} size={18} color="#FFF" />
                    </View>

                    {/* Content inside image */}
                    <View style={styles.cardOverlayContent}>
                      <Text style={styles.opName} numberOfLines={2}>{op.name}</Text>
                      <Text style={styles.opEst}>
                        Est: {calculation.workers} workers · {calculation.duration} {calculation.duration === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F4',
  },
  header: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: { paddingTop: 4 },
      android: { paddingTop: 18 },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  calculatorCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  calcHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calcTitle: {
    fontSize: 16,
    fontWeight: '850',
    color: colors.primary,
  },
  calcBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inputRow: {
    marginTop: 14,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '750',
    color: '#64748B',
    marginBottom: 6,
  },
  textInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#F8FAFC',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  acresSuffix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  calculateBtn: {
    backgroundColor: colors.primary,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  calculateBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  costDisplayCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.primaryMedium,
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  costValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primaryDark || colors.primary,
    marginTop: 4,
  },
  costSubtext: {
    fontSize: 10,
    color: colors.primary,
    marginTop: 6,
    textAlign: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeadline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  sectionSubline: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '550',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  cardContainer: {
    width: '47.5%',
    aspectRatio: 0.9,
    marginBottom: 12,
  },
  opCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardImageContainer: {
    flex: 1,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  iconBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  cardOverlayContent: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  opName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  opEst: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '700',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default CropWorkTypesScreen;
