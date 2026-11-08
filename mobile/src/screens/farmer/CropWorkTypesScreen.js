import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Platform,
  Image,
  Animated,
  Easing,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { fetchWageRates, getBenchmarkWage, getCachedWageRates } from '../../utils/wageHelper';

// Highly recognizable 3D cartoon illustrations for rural low-literacy farmers
const WORK_IMAGES = {
  landPrep: require('../../../assets/work_types/land_prep.jpg'),
  pitDigging: require('../../../assets/work_types/pit_digging.jpg'),
  plantingSaplings: require('../../../assets/work_types/planting_saplings.jpg'),
  irrigation: require('../../../assets/work_types/irrigation.jpg'),
  fertilizer: require('../../../assets/work_types/fertilizer.jpg'),
  spraying: require('../../../assets/work_types/spraying.jpg'),
  pruning: require('../../../assets/work_types/pruning.jpg'),
  weeding: require('../../../assets/work_types/weeding.jpg'),
  harvesting: require('../../../assets/work_types/harvesting.jpg'),
  loadingPacking: require('../../../assets/work_types/loading_packing.jpg'),
  constMasonry: require('../../../assets/work_types/const_masonry.jpg'),
  constCarpentry: require('../../../assets/work_types/const_carpentry.jpg'),
};

const CropWorkTypesScreen = ({ route, navigation }) => {
  const { cropId, cropName, cropGradient } = route?.params || {
    cropId: 'paddy',
    cropName: 'Paddy',
    cropGradient: ['#2E7D32', '#1B5E20'],
  };

  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [acreage, setAcreage] = useState('2');
  const [isCalcExpanded, setIsCalcExpanded] = useState(false);
  const [calcCost, setCalcCost] = useState(null);
  const [wageRates, setWageRates] = useState(getCachedWageRates());

  useEffect(() => {
    fetchWageRates().then(rates => {
      if (rates) setWageRates(rates);
    });
  }, []);

  // Define dynamic operations list based on crop selection
  const getOperationsForCrop = () => {
    // ─── 1. మేస్త్రీలు & కాంక్రీట్ పనులు (Construction & Building Operations) ───
    if (cropId === 'const_masonry') {
      return [
        {
          id: 'brickwork_walls',
          name: 'ఇటుక గోడల నిర్మాణం (Bricklaying & Wall Construction)',
          skillKeyword: 'mason',
          icon: 'foundation',
          image: WORK_IMAGES.constMasonry,
          calc: (acres) => ({ workers: Math.max(3, Math.round(4 * acres)), duration: 2 }),
        },
        {
          id: 'wall_plastering',
          name: 'గోడల ప్లాస్టరింగ్ / గార పని (Wall Plastering)',
          skillKeyword: 'mason',
          icon: 'format-paint',
          image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(3, Math.round(5 * acres)), duration: 2 }),
        },
        {
          id: 'compound_wall',
          name: 'కాంపౌండ్ వాల్ నిర్మాణం (Boundary & Compound Wall)',
          skillKeyword: 'mason',
          icon: 'fence',
          image: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(4 * acres)), duration: 3 }),
        },
        {
          id: 'foundation_masonry',
          name: 'పునాది & బేస్మెంట్ రాతి పని (Basement Stone Masonry)',
          skillKeyword: 'mason',
          icon: 'view-quilt',
          image: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(4, Math.round(6 * acres)), duration: 2 }),
        },
      ];
    }

    if (cropId === 'const_concrete') {
      return [
        {
          id: 'concrete_mixing_pouring',
          name: 'కాంక్రీట్ మిక్సింగ్ & పోత (Mixing & Pouring Gang)',
          skillKeyword: 'concrete',
          icon: 'cached',
          image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(5, Math.round(8 * acres)), duration: 1 }),
        },
        {
          id: 'shuttering_formwork',
          name: 'సెంటరింగ్ & షట్టరింగ్ అమరిక (Centering & Shuttering)',
          skillKeyword: 'formwork',
          icon: 'view-quilt',
          image: WORK_IMAGES.constCarpentry,
          calc: (acres) => ({ workers: Math.max(3, Math.round(4 * acres)), duration: 2 }),
        },
        {
          id: 'slab_casting',
          name: 'రూఫ్ స్లాబ్ కాస్టింగ్ & ఫినిషింగ్ (Roof Slab Casting)',
          skillKeyword: 'concrete',
          icon: 'layers',
          image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(6, Math.round(10 * acres)), duration: 1 }),
        },
        {
          id: 'concrete_curing',
          name: 'కాంక్రీట్ క్యూరింగ్ & నీళ్లు కొట్టడం (Curing & Watering)',
          skillKeyword: 'concrete',
          icon: 'opacity',
          image: WORK_IMAGES.constMasonry,
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 3 }),
        },
      ];
    }

    if (cropId === 'const_barbending') {
      return [
        {
          id: 'slab_mesh_binding',
          name: 'స్లాబ్ స్టీల్ మెష్ కట్టడం (Slab Steel Mesh Binding)',
          skillKeyword: 'welder',
          icon: 'construction',
          image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(3, Math.round(5 * acres)), duration: 1 }),
        },
        {
          id: 'column_beam_binding',
          name: 'పిల్లర్స్ & బీమ్స్ రాడ్ కట్టడం (Pillars & Beams Rebar)',
          skillKeyword: 'welder',
          icon: 'view-column',
          image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(3, Math.round(4 * acres)), duration: 2 }),
        },
        {
          id: 'rebar_cutting_bending',
          name: 'కడ్డీలు కత్తిరించడం & వంచడం (Rebar Cutting & Bending)',
          skillKeyword: 'welder',
          icon: 'content-cut',
          image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 1 }),
        },
      ];
    }

    if (cropId === 'const_carpentry') {
      return [
        {
          id: 'doors_windows_fitting',
          name: 'తలుపులు & కిటికీల ఫ్రేముల బిగింపు (Door & Window Fitting)',
          skillKeyword: 'carpenter',
          icon: 'meeting-room',
          image: WORK_IMAGES.constCarpentry,
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 2 }),
        },
        {
          id: 'wooden_centering_support',
          name: 'చెక్క సెంటరింగ్ & తాత్కాలిక సపోర్ట్ (Centering Support)',
          skillKeyword: 'carpenter',
          icon: 'handyman',
          image: WORK_IMAGES.constCarpentry,
          calc: (acres) => ({ workers: Math.max(3, Math.round(4 * acres)), duration: 1 }),
        },
        {
          id: 'cupboards_wood_polish',
          name: 'కప్ బోర్డులు & వుడ్ పాలిష్ (Cupboards & Wood Polish)',
          skillKeyword: 'carpenter',
          icon: 'carpenter',
          image: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(2 * acres)), duration: 3 }),
        },
      ];
    }

    if (cropId === 'const_electrical') {
      return [
        {
          id: 'pipe_conduit_wiring',
          name: 'పైపులు వేయడం & ఇంటర్నల్ వైరింగ్ (Pipe Conduits & Wiring)',
          skillKeyword: 'electrician',
          icon: 'electrical-services',
          image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 2 }),
        },
        {
          id: 'switchboard_mcb_fitting',
          name: 'స్విచ్ బోర్డులు & MCB బాక్స్ అమరిక (Switchboards & MCB)',
          skillKeyword: 'electrician',
          icon: 'settings-input-component',
          image: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(2 * acres)), duration: 1 }),
        },
        {
          id: 'fixtures_fans_earthing',
          name: 'లైట్లు, ఫ్యాన్లు & ఎర్తింగ్ కనెక్షన్ (Fixtures & Earthing)',
          skillKeyword: 'electrician',
          icon: 'lightbulb',
          image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
        },
      ];
    }

    if (cropId === 'const_plumbing') {
      return [
        {
          id: 'water_pipes_fitting',
          name: 'నీటి పైపులు & CPVC లైన్ల అమరిక (Water Pipes & CPVC Lines)',
          skillKeyword: 'plumber',
          icon: 'plumbing',
          image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 2 }),
        },
        {
          id: 'sanitary_bathroom_fittings',
          name: 'బాత్‌రూమ్ ట్యాప్స్, కమోడ్ & సింక్ (Sanitary & Bathroom)',
          skillKeyword: 'plumber',
          icon: 'bathtub',
          image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(2 * acres)), duration: 2 }),
        },
        {
          id: 'tank_motor_connection',
          name: 'ట్యాంక్ & బోర్‌వెల్ మోటార్ కనెక్షన్ (Tank & Motor Connection)',
          skillKeyword: 'plumber',
          icon: 'water-damage',
          image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
        },
      ];
    }

    if (cropId === 'const_painting') {
      return [
        {
          id: 'wall_putty_primer',
          name: 'వాల్ పుట్టీ & ప్రైమర్ పూత (Wall Putty & Primer)',
          skillKeyword: 'painter',
          icon: 'format-paint',
          image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 2 }),
        },
        {
          id: 'interior_paint',
          name: 'లోపలి గోడలకు ఎమల్షన్ పెయింట్ (Interior Wall Painting)',
          skillKeyword: 'painter',
          icon: 'brush',
          image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 2 }),
        },
        {
          id: 'exterior_weathercoat',
          name: 'బయటి గోడల వెదర్ కోట్ పెయింట్ (Exterior Weathercoat)',
          skillKeyword: 'painter',
          icon: 'texture',
          image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 2 }),
        },
      ];
    }

    if (cropId === 'const_welding') {
      return [
        {
          id: 'gates_grills_welding',
          name: 'మెయిన్ గేట్లు & కిటికీ గ్రిల్స్ తయారీ (Gates & Grills Fabrication)',
          skillKeyword: 'welder',
          icon: 'hardware',
          image: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 2 }),
        },
        {
          id: 'shed_roof_truss',
          name: 'ఐరన్ షెడ్లు & రేకుల పైకప్పు నిర్మాణం (Iron Sheds & Roofing Truss)',
          skillKeyword: 'welder',
          icon: 'roofing',
          image: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(3, Math.round(4 * acres)), duration: 3 }),
        },
        {
          id: 'spot_welding_repairs',
          name: 'స్పాట్ వెల్డింగ్ & ఇనుప మరమ్మతులు (Spot Welding & Repairs)',
          skillKeyword: 'welder',
          icon: 'blur-on',
          image: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
        },
      ];
    }

    if (cropId === 'const_tiles_marble') {
      return [
        {
          id: 'floor_tiles_laying',
          name: 'ఫ్లోరింగ్ టైల్స్ వేయడం & లెవలింగ్ (Floor Tiles Laying)',
          skillKeyword: 'mason',
          icon: 'dashboard-customize',
          image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 2 }),
        },
        {
          id: 'kitchen_granite_fitting',
          name: 'కిచెన్ ప్లాట్‌ఫారమ్ గ్రానైట్ ఫిట్టింగ్ (Kitchen Granite Platform)',
          skillKeyword: 'mason',
          icon: 'kitchen',
          image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(2 * acres)), duration: 1 }),
        },
        {
          id: 'bathroom_wall_tiles',
          name: 'బాత్‌రూమ్ & గోడల టైల్స్ ఫిక్సింగ్ (Bathroom & Wall Tiles)',
          skillKeyword: 'mason',
          icon: 'border-all',
          image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 2 }),
        },
      ];
    }

    if (cropId === 'const_helper') {
      return [
        {
          id: 'material_shifting',
          name: 'ఇసుక, కంకర, సిమెంట్, ఇటుకలు మోయడం (Material Shifting)',
          skillKeyword: 'labour',
          icon: 'engineering',
          image: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(4, Math.round(6 * acres)), duration: 1 }),
        },
        {
          id: 'foundation_earthwork',
          name: 'పునాది గుంతలు తవ్వడం & మట్టి పని (Foundation Digging & Earthwork)',
          skillKeyword: 'labour',
          icon: 'terrain',
          image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(3, Math.round(5 * acres)), duration: 2 }),
        },
        {
          id: 'site_cleaning_debris',
          name: 'సైట్ క్లీనింగ్ & వ్యర్థాల తొలగింపు (Site Cleaning & Debris)',
          skillKeyword: 'labour',
          icon: 'cleaning-services',
          image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop',
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 1 }),
        },
      ];
    }

    if (cropId === 'const_safety' || cropId === 'const_site_safety') {
      return [
        {
          id: 'safetyFencing',
          name: 'Safety Fencing & Barriers',
          skillKeyword: 'labour',
          icon: 'security',
          image: WORK_IMAGES.constCarpentry,
          calc: (acres) => ({ workers: Math.max(2, Math.round(2 * acres)), duration: 1 }),
        },
        {
          id: 'temporaryStructures',
          name: 'Temporary Safety Barriers',
          skillKeyword: 'labour',
          icon: 'home-work',
          image: WORK_IMAGES.constCarpentry,
          calc: (acres) => ({ workers: Math.max(2, Math.round(2 * acres)), duration: 1 }),
        },
      ];
    }

    if (cropId === 'paddy') {
      return [
        {
          id: 'landPrep',
          name: t('cropWorkTypes.paddyLandPrep') || 'Land Preparation (Ploughing)',
          skillKeyword: 'tractor',
          icon: 'agriculture',
          image: WORK_IMAGES.landPrep,
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: Math.max(1, Math.round(1 * acres)) }),
        },
        {
          id: 'nurseryPrep',
          name: t('cropWorkTypes.nurseryPrep') || 'Nursery Preparation',
          skillKeyword: 'sowing',
          icon: 'grass',
          image: WORK_IMAGES.plantingSaplings,
          calc: (acres) => ({ workers: Math.max(1, Math.round(3 * acres)), duration: 1 }),
        },
        {
          id: 'transplanting',
          name: t('cropWorkTypes.transplanting') || 'Transplanting',
          skillKeyword: 'sowing',
          icon: 'spa',
          image: WORK_IMAGES.plantingSaplings,
          calc: (acres) => ({ workers: Math.max(2, Math.round(5 * acres)), duration: 1 }),
        },
        {
          id: 'directSeeding',
          name: t('cropWorkTypes.directSeeding') || 'Direct Seeding',
          skillKeyword: 'sowing',
          icon: 'grain',
          image: WORK_IMAGES.fertilizer,
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
        },
        {
          id: 'irrigation',
          name: t('cropWorkTypes.irrigationOrchard') || 'Irrigation',
          skillKeyword: 'labour',
          icon: 'opacity',
          image: WORK_IMAGES.irrigation,
          calc: (acres) => ({ workers: Math.max(1, Math.round(1 * acres)), duration: 1 }),
        },
        {
          id: 'fertilizerApp',
          name: t('cropWorkTypes.fertilizerAppOrchard') || 'Fertilizer Application',
          skillKeyword: 'labour',
          icon: 'bubble-chart',
          image: WORK_IMAGES.fertilizer,
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
        },
        {
          id: 'weeding',
          name: t('cropWorkTypes.weedingOrchard') || 'Weed Removal',
          skillKeyword: 'labour',
          icon: 'filter-hdr',
          image: WORK_IMAGES.weeding,
          calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 1 }),
        },
        {
          id: 'spraying',
          name: t('cropWorkTypes.sprayingOrchard') || 'Pesticide Spraying',
          skillKeyword: 'labour',
          icon: 'waves',
          image: WORK_IMAGES.spraying,
          calc: (acres) => ({ workers: Math.max(1, Math.round(1 * acres)), duration: 1 }),
        },
        {
          id: 'harvesting',
          name: t('cropWorkTypes.harvesting') || 'Harvesting',
          skillKeyword: 'harvesting',
          icon: 'grain',
          image: WORK_IMAGES.harvesting,
          calc: (acres) => ({ workers: Math.max(4, Math.round(8 * acres)), duration: 1 }),
        },
        {
          id: 'threshing',
          name: t('cropWorkTypes.threshing') || 'Threshing',
          skillKeyword: 'harvesting',
          icon: 'waves',
          image: WORK_IMAGES.harvesting,
          calc: (acres) => ({ workers: Math.max(2, Math.round(4 * acres)), duration: 1 }),
        },
        {
          id: 'drying',
          name: t('cropWorkTypes.drying') || 'Drying',
          skillKeyword: 'labour',
          icon: 'wb-sunny',
          image: WORK_IMAGES.harvesting,
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
        },
        {
          id: 'bagFilling',
          name: t('cropWorkTypes.bagFilling') || 'Bag Filling',
          skillKeyword: 'labour',
          icon: 'shopping-bag',
          image: WORK_IMAGES.loadingPacking,
          calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
        },
        {
          id: 'loading',
          name: t('cropWorkTypes.loadingOrchard') || 'Loading',
          skillKeyword: 'labour',
          icon: 'local-shipping',
          image: WORK_IMAGES.loadingPacking,
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
        image: WORK_IMAGES.landPrep,
        calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: Math.max(1, Math.round(1 * acres)) }),
      },
      {
        id: 'pitDigging',
        name: t('cropWorkTypes.pitDigging') || 'Pit Digging',
        skillKeyword: 'labour',
        icon: 'gavel',
        image: WORK_IMAGES.pitDigging,
        calc: (acres) => ({ workers: Math.max(2, Math.round(4 * acres)), duration: 1 }),
      },
      {
        id: 'plantingSaplings',
        name: t('cropWorkTypes.plantingSaplings') || 'Planting Saplings',
        skillKeyword: 'sowing',
        icon: 'park',
        image: WORK_IMAGES.plantingSaplings,
        calc: (acres) => ({ workers: Math.max(1, Math.round(3 * acres)), duration: 1 }),
      },
      {
        id: 'irrigationOrchard',
        name: t('cropWorkTypes.irrigationOrchard') || 'Irrigation',
        skillKeyword: 'labour',
        icon: 'opacity',
        image: WORK_IMAGES.irrigation,
        calc: (acres) => ({ workers: Math.max(1, Math.round(1 * acres)), duration: 1 }),
      },
      {
        id: 'fertilizerAppOrchard',
        name: t('cropWorkTypes.fertilizerAppOrchard') || 'Fertilizer Application',
        skillKeyword: 'labour',
        icon: 'bubble-chart',
        image: WORK_IMAGES.fertilizer,
        calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
      },
      {
        id: 'sprayingOrchard',
        name: t('cropWorkTypes.sprayingOrchard') || 'Pesticide Spraying',
        skillKeyword: 'labour',
        icon: 'waves',
        image: WORK_IMAGES.spraying,
        calc: (acres) => ({ workers: Math.max(1, Math.round(1 * acres)), duration: 1 }),
      },
      {
        id: 'pruning',
        name: t('cropWorkTypes.pruning') || 'Pruning',
        skillKeyword: 'labour',
        icon: 'content-cut',
        image: WORK_IMAGES.pruning,
        calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
      },
      {
        id: 'weedingOrchard',
        name: t('cropWorkTypes.weedingOrchard') || 'Weed Removal',
        skillKeyword: 'labour',
        icon: 'filter-hdr',
        image: WORK_IMAGES.weeding,
        calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 1 }),
      },
      {
        id: 'fruitThinning',
        name: t('cropWorkTypes.fruitThinning') || 'Fruit Thinning',
        skillKeyword: 'labour',
        icon: 'nature',
        image: WORK_IMAGES.pruning,
        calc: (acres) => ({ workers: Math.max(1, Math.round(2 * acres)), duration: 1 }),
      },
      {
        id: 'harvestingOrchard',
        name: t('cropWorkTypes.harvestingOrchard') || 'Harvesting',
        skillKeyword: 'harvesting',
        icon: 'grain',
        image: WORK_IMAGES.harvesting,
        calc: (acres) => ({ workers: Math.max(3, Math.round(6 * acres)), duration: 1 }),
      },
      {
        id: 'sortingGrading',
        name: t('cropWorkTypes.sortingGrading') || 'Sorting & Grading',
        skillKeyword: 'labour',
        icon: 'sort',
        image: WORK_IMAGES.loadingPacking,
        calc: (acres) => ({ workers: Math.max(2, Math.round(4 * acres)), duration: 1 }),
      },
      {
        id: 'packing',
        name: t('cropWorkTypes.packing') || 'Packing',
        skillKeyword: 'labour',
        icon: 'inbox',
        image: WORK_IMAGES.loadingPacking,
        calc: (acres) => ({ workers: Math.max(1, Math.round(3 * acres)), duration: 1 }),
      },
      {
        id: 'loadingOrchard',
        name: t('cropWorkTypes.loadingOrchard') || 'Loading',
        skillKeyword: 'labour',
        icon: 'local-shipping',
        image: WORK_IMAGES.loadingPacking,
        calc: (acres) => ({ workers: Math.max(2, Math.round(3 * acres)), duration: 1 }),
      },
      {
        id: 'orchardCleaning',
        name: t('cropWorkTypes.orchardCleaning') || 'Orchard Cleaning',
        skillKeyword: 'labour',
        icon: 'cleaning-services',
        image: WORK_IMAGES.weeding,
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
    const benchmarkWage = getBenchmarkWage({
      cropId,
      operationId: defaultOp.id,
      skillKeyword: defaultOp.skillKeyword,
      rates: wageRates,
    });
    // Dynamic benchmark cost estimation = workers * duration * benchmarkWage
    const estimatedCost = calcResult.workers * calcResult.duration * benchmarkWage;
    setCalcCost(estimatedCost);
  };

  const handleProceed = (op) => {
    const acresVal = parseFloat(acreage) || 0;
    const calculation = op.calc(acresVal);
    const benchmarkWage = getBenchmarkWage({
      cropId,
      operationId: op.id,
      skillKeyword: op.skillKeyword,
      rates: wageRates,
    });

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
      suggestedWage: benchmarkWage,
      minDailyWage: wageRates.minDailyWage || 400,
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
            const opWage = getBenchmarkWage({
              cropId,
              operationId: op.id,
              skillKeyword: op.skillKeyword,
              rates: wageRates,
            });
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
                      <View style={{ marginTop: 2, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#4ADE80' }}>
                          ₹{opWage}/day
                        </Text>
                      </View>
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
    lineHeight: 28,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  sectionSubline: {
    fontSize: 13,
    lineHeight: 18,
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
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    color: '#FFF',
    flexShrink: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  opEst: {
    fontSize: 11,
    lineHeight: 16,
    color: '#E2E8F0',
    fontWeight: '700',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default CropWorkTypesScreen;
