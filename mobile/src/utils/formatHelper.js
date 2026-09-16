// formatHelper.js — Human-friendly names and bilingual formatters for agricultural terms, statuses, crops, and machinery

const WORK_TYPE_MAP = {
  // Agriculture Operations
  sowing: { en: 'Sowing / Seeding', te: 'విత్తనం నాటడం (Sowing)', hi: 'बुआई (Sowing)' },
  seeding: { en: 'Seeding / Sowing', te: 'విత్తనాలు చల్లడం (Seeding)', hi: 'बीज बोना (Seeding)' },
  transplanting: { en: 'Transplanting', te: 'మొక్కలు నాటడం (Transplanting)', hi: 'पौध रोपाई (Transplanting)' },
  harvesting: { en: 'Harvesting', te: 'పంట కోత (Harvesting)', hi: 'फसल कटाई (Harvesting)' },
  weeding: { en: 'Weeding & Cleaning', te: 'కలుపు తీయడం (Weeding)', hi: 'निराई-गुड़ाई (Weeding)' },
  irrigation: { en: 'Watering / Irrigation', te: 'నీరు పెట్టడం (Irrigation)', hi: 'सिंचाई (Irrigation)' },
  spraying: { en: 'Pesticide Spraying', te: 'మందులు పిచికారీ (Spraying)', hi: 'दवा छिड़काव (Spraying)' },
  plowing: { en: 'Plowing / Tilling', te: 'దుక్కి దున్నడం (Plowing)', hi: 'खेत जोतना (Plowing)' },
  tilling: { en: 'Tilling / Plowing', te: 'నేల దున్నడం (Tilling)', hi: 'जुताई (Tilling)' },
  cotton_picking: { en: 'Cotton Picking', te: 'పత్తి తీయడం (Cotton Picking)', hi: 'कपास चुनना (Cotton Picking)' },
  chilli_picking: { en: 'Chilli Picking', te: 'మిర్చి కోత (Chilli Picking)', hi: 'मिर्च तोड़ना (Chilli Picking)' },
  paddy_harvesting: { en: 'Paddy Harvesting', te: 'వరి కోత & నూర్పిడి (Paddy Harvesting)', hi: 'धान कटाई (Paddy Harvesting)' },
  paddy_transplanting: { en: 'Paddy Planting', te: 'వరి నాట్లు వేయడం (Paddy Planting)', hi: 'धान रोपाई (Paddy Planting)' },
  sugarcane_cutting: { en: 'Sugarcane Cutting', te: 'చెరకు నరకడం (Sugarcane Cutting)', hi: 'गन्ना कटाई (Sugarcane Cutting)' },
  pruning: { en: 'Pruning / Trimming', te: 'కత్తిరింపు పనులు (Pruning)', hi: 'छंटाई (Pruning)' },
  fertilizing: { en: 'Fertilizer Application', te: 'ఎరువులు వేయడం (Fertilizing)', hi: 'खाद डालना (Fertilizing)' },
  labour: { en: 'General Farm Labour', te: 'వ్యవసాయ కూలీ పనులు (Labour)', hi: 'कृषि मजदूरी (Labour)' },
  general: { en: 'Farm Work', te: 'పొలం పనులు (Farm Work)', hi: 'खेत का काम (Farm Work)' },

  // Construction / Technical Trades
  concreteMixing: { en: 'Concrete Mixing', te: 'కాంక్రీట్ కలపడం (Concrete Mixing)', hi: 'कंक्रीट मिश्रण (Concrete Mixing)' },
  formworkAssembly: { en: 'Formwork / Centering', te: 'సెంట్రింగ్ & ఫార్మ్‌వర్క్ (Formwork)', hi: 'सेंट्रिंग कार्य (Formwork)' },
  concretePouring: { en: 'Concrete Pouring', te: 'కాంక్రీట్ పోయడం (Concrete Pouring)', hi: 'कंक्रीट ढलाई (Concrete Pouring)' },
  woodworkCarpentry: { en: 'Carpentry Work', te: 'వడ్రంగి పనులు (Carpentry)', hi: 'बढ़ई का काम (Carpentry)' },
  masonryBrickwork: { en: 'Brick & Stone Masonry', te: 'తాపీ పనులు (Masonry)', hi: 'राजमिस्त्री काम (Masonry)' },
  electricalWiring: { en: 'Electrical Work', te: 'కరెంట్ / ఎలక్ట్రికల్ పనులు (Electrical)', hi: 'बिजली का काम (Electrical)' },
  plumbingFitting: { en: 'Plumbing & Pipes', te: 'ప్లంబింగ్ పనులు (Plumbing)', hi: 'नलसाजी काम (Plumbing)' },
  paintingFinishing: { en: 'Painting & Finishing', te: 'రంగులు / పెయింటింగ్ (Painting)', hi: 'रंगाई-पुताई (Painting)' },
};

const CROP_NAME_MAP = {
  paddy: { en: 'Paddy / Rice', te: 'వరి (Paddy)', hi: 'धान / चावल' },
  cotton: { en: 'Cotton', te: 'పత్తి (Cotton)', hi: 'कपास' },
  chilli: { en: 'Chilli', te: 'మిరప (Chilli)', hi: 'मिर्च' },
  pulses: { en: 'Pulses', te: 'పప్పు ధాన్యాలు', hi: 'दालें' },
  redgram: { en: 'Red Gram (Kandi)', te: 'కంది పప్పు (Red Gram)', hi: 'अरहर दाल' },
  blackgram: { en: 'Black Gram (Minumu)', te: 'మినుములు (Black Gram)', hi: 'उड़द दाल' },
  greengram: { en: 'Green Gram (Pesara)', te: 'పెసలు (Green Gram)', hi: 'मूंग दाल' },
  bengalgram: { en: 'Bengal Gram (Senaga)', te: 'శనగలు (Bengal Gram)', hi: 'चना' },
  sugarcane: { en: 'Sugarcane', te: 'చెరకు (Sugarcane)', hi: 'गन्ना' },
  tobacco: { en: 'Tobacco', te: 'పొగాకు (Tobacco)', hi: 'तंबाकू' },
  cashew: { en: 'Cashew', te: 'జీడిమామిడి (Cashew)', hi: 'काजू' },
  mango: { en: 'Mango Orchard', te: 'మామిడి తోట (Mango)', hi: 'आम का बाग' },
  groundnut: { en: 'Groundnut / Peanut', te: 'వేరుశనగ (Groundnut)', hi: 'मूंगफली' },
  maize: { en: 'Maize / Corn', te: 'మొక్కజొన్న (Maize)', hi: 'मक्का' },
  turmeric: { en: 'Turmeric', te: 'పసుపు (Turmeric)', hi: 'हल्दी' },
  tomato: { en: 'Tomato', te: 'టమాటా (Tomato)', hi: 'टमाटर' },
  onion: { en: 'Onion', te: 'ఉల్లిపాయలు (Onion)', hi: 'प्याज' },
  vegetables: { en: 'Vegetables', te: 'కూరగాయలు (Vegetables)', hi: 'सब्जियां' },
};

const MACHINERY_NAME_MAP = {
  tractor: { en: 'Tractor (35-50 HP)', te: 'ట్రాక్టర్ (Tractor)', hi: 'ट्रैक्टर' },
  harvester: { en: 'Combine Harvester', te: 'వరి కోత మిషన్ (Harvester)', hi: 'कंबाइन हार्वेस्टर' },
  rotavator: { en: 'Rotavator / Cultivator', te: 'రోటవేటర్ (Rotavator)', hi: 'रोटावेटर' },
  pesticide_sprayer: { en: 'Power Sprayer / Drone', te: 'స్ప్రేయర్ / డ్రోన్ (Sprayer)', hi: 'स्प्रेयर मशीन' },
  baler: { en: 'Straw Baler Machine', te: 'గడ్డి కట్టే మిషన్ (Baler)', hi: 'पुआल बेलर' },
  thresher: { en: 'Multi-Crop Thresher', te: 'నూర్పిడి మిషన్ (Thresher)', hi: 'थ्रेशर' },
};

const STATUS_MAP = {
  pending: { en: 'Finding Workers...', te: 'కార్మికుల కోసం వెతుకుతోంది...', hi: 'मजदूरों की तलाश...' },
  accepted: { en: 'Workers Confirmed', te: 'కార్మికులు ఒప్పుకున్నారు', hi: 'मजदूर तैयार हैं' },
  in_progress: { en: 'Work in Progress', te: 'పని జరుగుతోంది', hi: 'काम चल रहा है' },
  finishing: { en: 'Completing Shift', te: 'ముగింపు దశలో ఉంది', hi: 'समापन पर' },
  completed: { en: 'Work Completed', te: 'పని పూర్తయింది', hi: 'काम पूरा हुआ' },
  cancelled: { en: 'Job Cancelled', te: 'పని రద్దు చేయబడింది', hi: 'काम रद्द किया गया' },
  available: { en: 'Available Now', te: 'పనికి అందుబాటులో ఉంది', hi: 'काम के लिए उपलब्ध' },
  working: { en: 'Working on Farm', te: 'పొలంలో పని చేస్తున్నారు', hi: 'काम कर रहे हैं' },
  offline: { en: 'Offline / Resting', te: 'విశ్రాంతిలో ఉన్నారు', hi: 'ऑफलाइन' },
};

/**
 * Format any raw work code into human-friendly bilingual text
 */
export const formatWorkType = (code, lang = 'te') => {
  if (!code) return lang === 'te' ? 'వ్యవసాయ పని' : 'Farm Work';
  const cleanKey = String(code).replace(/[-\s]/g, '_').toLowerCase();
  
  // Direct match
  if (WORK_TYPE_MAP[code]) return WORK_TYPE_MAP[code][lang] || WORK_TYPE_MAP[code].te || WORK_TYPE_MAP[code].en;
  if (WORK_TYPE_MAP[cleanKey]) return WORK_TYPE_MAP[cleanKey][lang] || WORK_TYPE_MAP[cleanKey].te || WORK_TYPE_MAP[cleanKey].en;

  // Partial match
  for (const [key, val] of Object.entries(WORK_TYPE_MAP)) {
    if (cleanKey.includes(key.toLowerCase()) || key.toLowerCase().includes(cleanKey)) {
      return val[lang] || val.te || val.en;
    }
  }

  // Convert snake_case or camelCase to Clean Title
  const formatted = String(code)
    .replace(/([a-z])([A-Z])/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  return formatted || (lang === 'te' ? 'పొలం పని' : 'Farm Work');
};

/**
 * Format crop code into clean title
 */
export const formatCropName = (code, lang = 'te') => {
  if (!code) return lang === 'te' ? 'పంట (Crop)' : 'Crop';
  const cleanKey = String(code).toLowerCase().replace(/[_-]+/g, '');
  
  if (CROP_NAME_MAP[code]) return CROP_NAME_MAP[code][lang] || CROP_NAME_MAP[code].te || CROP_NAME_MAP[code].en;
  if (CROP_NAME_MAP[cleanKey]) return CROP_NAME_MAP[cleanKey][lang] || CROP_NAME_MAP[cleanKey].te || CROP_NAME_MAP[cleanKey].en;

  for (const [key, val] of Object.entries(CROP_NAME_MAP)) {
    if (cleanKey.includes(key) || key.includes(cleanKey)) {
      return val[lang] || val.te || val.en;
    }
  }

  return String(code).charAt(0).toUpperCase() + String(code).slice(1);
};

/**
 * Format machinery name
 */
export const formatMachineryName = (code, lang = 'te') => {
  if (!code) return lang === 'te' ? 'వ్యవసాయ యంత్రం' : 'Farm Machinery';
  const cleanKey = String(code).toLowerCase();
  if (MACHINERY_NAME_MAP[cleanKey]) {
    return MACHINERY_NAME_MAP[cleanKey][lang] || MACHINERY_NAME_MAP[cleanKey].te;
  }
  return String(code).replace(/[_-]+/g, ' ').toUpperCase();
};

/**
 * Format status code
 */
export const formatStatus = (status, lang = 'te') => {
  if (!status) return '';
  const cleanKey = String(status).toLowerCase();
  if (STATUS_MAP[cleanKey]) {
    return STATUS_MAP[cleanKey][lang] || STATUS_MAP[cleanKey].te || STATUS_MAP[cleanKey].en;
  }
  return String(status).replace(/[_-]+/g, ' ');
};

/**
 * Format clean user name (no code-names or raw IDs)
 */
export const formatUserName = (user, fallback = 'Worker / కార్మికుడు') => {
  if (!user) return fallback;
  const name = typeof user === 'string' ? user : (user.name || user.fullName);
  if (!name || name.startsWith('USR-') || name.startsWith('job-') || name.startsWith('TXN')) {
    return fallback;
  }
  return name;
};
