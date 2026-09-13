// Wage Benchmark & Rate Resolver Utility
import { jobService } from '../services/api/jobService';

export const DEFAULT_WAGE_RATES = {
  minDailyWage: 400,
  enforceMinimum: true,
  cropRates: {
    paddy_harvesting: 500,
    sugarcane_cutting: 600,
    watering: 350,
    ploughing: 450,
    cotton_picking: 480,
    chilli_harvesting: 520,
  },
  constructionRates: {
    earthwork_excavation: 550,
    earthwork_grading: 500,
    earthwork_compaction: 480,
    earthwork_tunneling: 600,
    concrete_mixing: 550,
    concrete_formwork: 650,
    concrete_pouring: 600,
    concrete_shotcrete: 700,
    concrete_curing: 450,
    structural_scaffolding: 650,
    structural_bracing: 600,
    structural_temporary: 550,
    utility_drainage: 580,
    utility_conduits: 620,
    utility_storm_drains: 560,
    maintenance_cleanup: 450,
    maintenance_tools: 500,
    maintenance_traffic: 480,
  },
  skilledTradeRates: {
    mason: 800,
    carpenter: 800,
    plumber: 750,
    electrician: 750,
    welder: 750,
    painter: 700,
    machinery_operator: 900,
    steel_erector: 800,
  },
};

let cachedRates = { ...DEFAULT_WAGE_RATES };
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute fresh cache

/**
 * Fetch and cache latest wage rates from Admin System Settings
 */
export async function fetchWageRates(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && now - lastFetchTime < CACHE_TTL_MS && lastFetchTime > 0) {
    return cachedRates;
  }

  try {
    const res = await jobService.getWageRates();
    if (res.success && res.data) {
      cachedRates = {
        minDailyWage: res.data.minDailyWage || DEFAULT_WAGE_RATES.minDailyWage,
        enforceMinimum: res.data.enforceMinimum !== false,
        cropRates: { ...DEFAULT_WAGE_RATES.cropRates, ...(res.data.cropRates || {}) },
        constructionRates: { ...DEFAULT_WAGE_RATES.constructionRates, ...(res.data.constructionRates || {}) },
        skilledTradeRates: { ...DEFAULT_WAGE_RATES.skilledTradeRates, ...(res.data.skilledTradeRates || {}) },
      };
      lastFetchTime = now;
    }
  } catch (err) {
    console.warn('Failed to fetch live wage rates, using cached/defaults:', err);
  }

  return cachedRates;
}

/**
 * Get synchronous cached rates (or defaults)
 */
export function getCachedWageRates() {
  return cachedRates;
}

/**
 * Resolves the dynamic benchmark daily wage based on crop, operation, and skill
 */
export function getBenchmarkWage({
  cropId = '',
  operationId = '',
  skillKeyword = '',
  rates = null,
} = {}) {
  const activeRates = rates || cachedRates || DEFAULT_WAGE_RATES;
  const minWage = activeRates.minDailyWage || 400;
  const cropRates = activeRates.cropRates || {};
  const constRates = activeRates.constructionRates || {};
  const skilledRates = activeRates.skilledTradeRates || {};

  const cId = String(cropId || '').toLowerCase().trim();
  const opId = String(operationId || '').toLowerCase().trim();
  const skill = String(skillKeyword || '').toLowerCase().trim();

  // 1. Check Skilled Trade Specialist Rates
  if (skilledRates[opId]) return skilledRates[opId];
  if (skilledRates[skill]) return skilledRates[skill];
  if (skilledRates[cId]) return skilledRates[cId];

  if (opId.includes('mason') || skill.includes('mason')) return skilledRates.mason || 800;
  if (opId.includes('carpenter') || skill.includes('carpenter') || skill.includes('formwork')) return skilledRates.carpenter || 800;
  if (opId.includes('plumber') || skill.includes('plumber')) return skilledRates.plumber || 750;
  if (opId.includes('electrician') || skill.includes('electrician')) return skilledRates.electrician || 750;
  if (opId.includes('welder') || skill.includes('welder')) return skilledRates.welder || 750;
  if (opId.includes('painter') || skill.includes('painter')) return skilledRates.painter || 700;
  if (opId.includes('machinery') || skill.includes('machinery') || opId.includes('excavator') || opId.includes('crane')) return skilledRates.machinery_operator || 900;
  if (opId.includes('steel') || skill.includes('steel')) return skilledRates.steel_erector || 800;

  // 2. Check Construction Category Rates
  const constMapping = {
    excavation: 'earthwork_excavation',
    grading: 'earthwork_grading',
    compaction: 'earthwork_compaction',
    tunneling: 'earthwork_tunneling',
    concretemixing: 'concrete_mixing',
    concrete_mixing: 'concrete_mixing',
    formworkassembly: 'concrete_formwork',
    concrete_formwork: 'concrete_formwork',
    concretepouring: 'concrete_pouring',
    concrete_pouring: 'concrete_pouring',
    shotcrete: 'concrete_shotcrete',
    concretecuring: 'concrete_curing',
    concrete_curing: 'concrete_curing',
    scaffoldingerection: 'structural_scaffolding',
    scaffolding: 'structural_scaffolding',
    structural_scaffolding: 'structural_scaffolding',
    bracingassembly: 'structural_bracing',
    bracing: 'structural_bracing',
    structural_bracing: 'structural_bracing',
    temporarystructures: 'structural_temporary',
    structural_temporary: 'structural_temporary',
    drainagepipes: 'utility_drainage',
    utility_drainage: 'utility_drainage',
    electricalconduits: 'utility_conduits',
    utility_conduits: 'utility_conduits',
    stormdrains: 'utility_storm_drains',
    utility_storm_drains: 'utility_storm_drains',
    sitecleanup: 'maintenance_cleanup',
    maintenance_cleanup: 'maintenance_cleanup',
    toolmaintenance: 'maintenance_tools',
    maintenance_tools: 'maintenance_tools',
    trafficcontrol: 'maintenance_traffic',
    maintenance_traffic: 'maintenance_traffic',
  };

  const normalizedOp = opId.replace(/[^a-z0-9]/g, '');
  const mappedKey = constMapping[normalizedOp] || constMapping[opId];
  if (mappedKey && constRates[mappedKey]) {
    return constRates[mappedKey];
  }

  if (cId.startsWith('const_')) {
    if (cId.includes('earthwork')) return constRates.earthwork_excavation || 550;
    if (cId.includes('concrete')) return constRates.concrete_mixing || 550;
    if (cId.includes('structural')) return constRates.structural_scaffolding || 650;
    if (cId.includes('utility')) return constRates.utility_drainage || 580;
    if (cId.includes('maintenance')) return constRates.maintenance_cleanup || 450;
  }

  // 3. Check Crop Specific Benchmark Rates
  if (cropRates[`${cId}_${opId}`]) return cropRates[`${cId}_${opId}`];
  if (cropRates[opId]) return cropRates[opId];

  if (cId === 'paddy') {
    if (opId.includes('harvest')) return cropRates.paddy_harvesting || 500;
  }
  if (cId === 'sugarcane') {
    if (opId.includes('cut') || opId.includes('harvest')) return cropRates.sugarcane_cutting || 600;
  }
  if (cId === 'cotton') {
    if (opId.includes('pick') || opId.includes('harvest')) return cropRates.cotton_picking || 480;
  }
  if (cId === 'chilli') {
    if (opId.includes('harvest')) return cropRates.chilli_harvesting || 520;
  }
  if (opId.includes('water') || opId.includes('irrigat')) return cropRates.watering || 350;
  if (opId.includes('plough') || opId.includes('landprep') || skill.includes('tractor')) return cropRates.ploughing || 450;

  return minWage || 500;
}
