import React, { useState } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

const CropWorkTypesScreen = ({ route, navigation }) => {
  const { cropId, cropName, cropGradient } = route.params || {
    cropId: 'paddy',
    cropName: 'Paddy',
    cropGradient: ['#10B981', '#059669'],
  };

  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [acreage, setAcreage] = useState('2');
  const [selectedOp, setSelectedOp] = useState(null);

  // Define operations with mapping to backend skills and calculation rules
  const operations = [
    {
      id: 'landPrep',
      name: t('cropWorkTypes.landPrep') || 'Land Preparation',
      skillKeyword: 'tractor',
      icon: 'agriculture',
      calc: (acres) => {
        const workers = Math.max(1, Math.round(2 * acres));
        return { workers: `${workers} - ${workers + 1}`, duration: Math.max(1, Math.round(1 * acres)) };
      },
    },
    {
      id: 'nurseryPrep',
      name: t('cropWorkTypes.nurseryPrep') || 'Nursery Preparation',
      skillKeyword: 'sowing',
      icon: 'grass',
      calc: (acres) => {
        const workers = Math.max(1, Math.round(3 * acres));
        return { workers: `${workers} - ${workers + 1}`, duration: 1 };
      },
    },
    {
      id: 'transplanting',
      name: t('cropWorkTypes.transplanting') || 'Transplanting',
      skillKeyword: 'sowing',
      icon: 'spa',
      calc: (acres) => {
        const workers = Math.max(2, Math.round(5 * acres));
        return { workers: `${workers} - ${workers + 2}`, duration: 1 };
      },
    },
    {
      id: 'weeding',
      name: t('cropWorkTypes.weeding') || 'Weeding',
      skillKeyword: 'labour',
      icon: 'filter-hdr',
      calc: (acres) => {
        const workers = Math.max(2, Math.round(3 * acres));
        return { workers: `${workers} - ${workers + 1}`, duration: 1 };
      },
    },
    {
      id: 'harvesting',
      name: t('cropWorkTypes.harvesting') || 'Harvesting',
      skillKeyword: 'harvesting',
      icon: 'grain',
      calc: (acres) => {
        const workers = Math.max(4, Math.round(8 * acres));
        return { workers: `${workers} - ${workers + 2}`, duration: 1 };
      },
    },
    {
      id: 'spraying',
      name: t('cropWorkTypes.spraying') || 'Spraying',
      skillKeyword: 'labour',
      icon: 'waves',
      calc: (acres) => {
        const workers = Math.max(1, Math.round(1 * acres));
        return { workers: `${workers}`, duration: 1 };
      },
    },
    {
      id: 'sowing',
      name: t('cropWorkTypes.sowing') || 'Sowing',
      skillKeyword: 'sowing',
      icon: 'wb-sunny',
      calc: (acres) => {
        const workers = Math.max(1, Math.round(2 * acres));
        return { workers: `${workers}`, duration: 1 };
      },
    },
  ];

  // Default calculator selection
  const activeOp = selectedOp || operations.find(o => o.id === 'harvesting') || operations[0];
  const acresVal = parseFloat(acreage) || 0;
  const calcResult = activeOp.calc(acresVal);

  const filteredOps = operations.filter((op) =>
    op.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectOp = (op) => {
    setSelectedOp(op);
  };

  const handleProceed = (op) => {
    const calculation = op.calc(acresVal);
    // Parse recommended workers (e.g. "8 - 10" -> max is 10)
    const workerRange = calculation.workers.split('-').map(x => parseInt(x.trim()));
    const recommendedCount = workerRange[workerRange.length - 1] || 1;

    navigation.navigate('AvailableWorkers', {
      cropId,
      cropName,
      operationId: op.id,
      operationName: op.name,
      skillKeyword: op.skillKeyword,
      acreage: acresVal,
      workersNeeded: recommendedCount,
      estimatedDuration: calculation.duration,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Dynamic Themed Header */}
      <LinearGradient colors={cropGradient} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('cropWorkTypes.title', { crop: cropName }) || `${cropName} Operations`}
          </Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      {/* Acreage & Smart Calculator Section */}
      <View style={styles.calculatorSection}>
        <View style={styles.calcHeader}>
          <MaterialIcons name="calculate" size={24} color={cropGradient[0]} />
          <Text style={styles.calcTitle}>Smart Labour & Duration Calculator</Text>
        </View>
        
        <View style={styles.calcRow}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('cropWorkTypes.acreageLabel') || 'Enter Farm Size (Acres)'}</Text>
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

          <View style={styles.calcResultContainer}>
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>{t('cropWorkTypes.labourNeeded') || 'Labour estimate'}</Text>
              <Text style={[styles.resultValue, { color: cropGradient[0] }]}>
                {calcResult.workers} {t('common.workers') || 'Workers'}
              </Text>
            </View>
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>{t('cropWorkTypes.estimatedDuration') || 'Duration estimate'}</Text>
              <Text style={styles.resultValue}>
                {calcResult.duration} {calcResult.duration === 1 ? 'Day' : 'Days'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Operations List Header + Search */}
      <View style={styles.listHeaderSection}>
        <View style={styles.searchBarContainer}>
          <MaterialIcons name="search" size={22} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchTextInput}
            placeholder={t('cropWorkTypes.searchPlaceholder') || 'Search operations...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Operations Scrollable List */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {filteredOps.map((op) => {
          const isSelected = activeOp.id === op.id;
          return (
            <TouchableOpacity
              key={op.id}
              style={[
                styles.opCard,
                isSelected && { borderColor: cropGradient[0], backgroundColor: `${cropGradient[0]}05` },
              ]}
              onPress={() => handleSelectOp(op)}
              activeOpacity={0.7}
            >
              <View style={[styles.opIconContainer, { backgroundColor: isSelected ? cropGradient[0] : '#F1F5F9' }]}>
                <MaterialIcons name={op.icon} size={24} color={isSelected ? '#FFF' : '#64748B'} />
              </View>
              <View style={styles.opInfo}>
                <Text style={styles.opName}>{op.name}</Text>
                <Text style={styles.opCalculation}>
                  Est: {op.calc(acresVal).workers} workers · {op.calc(acresVal).duration} {op.calc(acresVal).duration === 1 ? 'day' : 'days'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleProceed(op)}
                style={[styles.proceedButton, { backgroundColor: cropGradient[0] }]}
              >
                <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  calculatorSection: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  calcTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  calcRow: {
    flexDirection: 'column',
    gap: 16,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
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
  calcResultContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  resultBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  listHeaderSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
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
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  opCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  opIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  opInfo: {
    flex: 1,
    marginLeft: 12,
  },
  opName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  opCalculation: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  proceedButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CropWorkTypesScreen;
