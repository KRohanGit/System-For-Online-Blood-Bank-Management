const HospitalProfile = require('../../models/HospitalProfile');
const SyntheticGeneration = require('../../models/SyntheticGeneration');
const { broadcast } = require('../realtime/socketService');
const eventBus = require('../realtime/eventBus');

const BLOOD_GROUP_WEIGHTS = [
  ['O+', 0.34],
  ['A+', 0.22],
  ['B+', 0.28],
  ['AB+', 0.07],
  ['O-', 0.04],
  ['A-', 0.025],
  ['B-', 0.02],
  ['AB-', 0.015]
];

const MALE_FIRST_NAMES = ['Arjun', 'Rohan', 'Vikram', 'Rahul', 'Siddharth', 'Kiran', 'Nikhil', 'Aman', 'Suresh', 'Aditya'];
const FEMALE_FIRST_NAMES = ['Asha', 'Priya', 'Sneha', 'Divya', 'Keerthi', 'Ananya', 'Isha', 'Nandini', 'Meera', 'Kavya'];
const LAST_NAMES = ['Reddy', 'Sharma', 'Patel', 'Verma', 'Iyer', 'Rao', 'Das', 'Kumar', 'Nair', 'Singh'];

const AGE_BANDS = {
  '18-24': (age) => age >= 18 && age <= 24,
  '25-34': (age) => age >= 25 && age <= 34,
  '35-44': (age) => age >= 35 && age <= 44,
  '45-55': (age) => age >= 45 && age <= 55,
  '56+': (age) => age >= 56
};

function createSeededRandom(seed) {
  let value = Number(seed) || 42;
  return function random() {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(random, min, max) {
  return min + (max - min) * random();
}

function pickWeighted(random, weightedItems) {
  const roll = random();
  let sum = 0;
  for (const [item, weight] of weightedItems) {
    sum += weight;
    if (roll <= sum) return item;
  }
  return weightedItems[weightedItems.length - 1][0];
}

function pickOne(random, list) {
  if (!Array.isArray(list) || !list.length) return null;
  return list[Math.floor(random() * list.length)];
}

function createGeoAround(random, lng, lat) {
  const radiusKm = randomBetween(random, 0.4, 8.5);
  const angle = randomBetween(random, 0, Math.PI * 2);
  const latOffset = (radiusKm / 111) * Math.cos(angle);
  const lngOffset = (radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2))) * Math.sin(angle);
  return {
    latitude: Number((lat + latOffset).toFixed(6)),
    longitude: Number((lng + lngOffset).toFixed(6))
  };
}

function buildScenarioModifiers(scenario) {
  const base = {
    availabilityBias: 0,
    eligibilityPenalty: 0,
    donationRecencyBiasDays: 0,
    notes: ['Baseline donor behavior applied.']
  };

  if (scenario === 'festival') {
    return {
      availabilityBias: -0.12,
      eligibilityPenalty: 0,
      donationRecencyBiasDays: -8,
      notes: [
        'Festival season lowers walk-in turnout and weekend availability.',
        'Clustered donor patterns increase around urban hospitals.'
      ]
    };
  }

  if (scenario === 'outbreak') {
    return {
      availabilityBias: -0.18,
      eligibilityPenalty: 0.1,
      donationRecencyBiasDays: 6,
      notes: [
        'Outbreak safety filters applied to reduce medically risky candidates.',
        'Eligibility constraints tightened for high-fever risk bands.'
      ]
    };
  }

  if (scenario === 'heatwave') {
    return {
      availabilityBias: -0.09,
      eligibilityPenalty: 0.03,
      donationRecencyBiasDays: 3,
      notes: [
        'Heatwave fatigue reduces participation in daytime windows.',
        'Late-evening availability receives slight uplift compared to baseline.'
      ]
    };
  }

  if (scenario === 'emergency_drive') {
    return {
      availabilityBias: 0.15,
      eligibilityPenalty: -0.02,
      donationRecencyBiasDays: -12,
      notes: [
        'Emergency drive campaigns boost donor mobilization.',
        'Rare blood-group outreach yields stronger participation rates.'
      ]
    };
  }

  return base;
}

function computeAvailability(random, age, daysSinceLastDonation, scenarioModifiers) {
  let score = 0.55;

  if (age >= 22 && age <= 34) score += 0.12;
  if (age >= 35 && age <= 49) score += 0.05;
  if (age >= 50) score -= 0.07;

  if (daysSinceLastDonation >= 120) score += 0.14;
  if (daysSinceLastDonation >= 90 && daysSinceLastDonation < 120) score += 0.07;
  if (daysSinceLastDonation < 70) score -= 0.2;

  score += scenarioModifiers.availabilityBias;
  score += randomBetween(random, -0.08, 0.08);

  return Math.max(0.05, Math.min(0.99, score));
}

function computeEligibility(gender, daysSinceLastDonation, scenarioModifiers, random) {
  const threshold = gender === 'female' ? 84 : 56;
  const adjustedThreshold = Math.max(42, threshold + scenarioModifiers.donationRecencyBiasDays);
  const baseEligible = daysSinceLastDonation >= adjustedThreshold;
  const riskRoll = random();

  if (!baseEligible) return false;
  if (scenarioModifiers.eligibilityPenalty <= 0) return true;

  return riskRoll > scenarioModifiers.eligibilityPenalty;
}

function summarizeRecords(records) {
  const bloodGroupDistribution = {};
  const ageBands = {
    '18-24': 0,
    '25-34': 0,
    '35-44': 0,
    '45-55': 0,
    '56+': 0
  };
  const availabilityBands = {
    low: 0,
    medium: 0,
    high: 0
  };

  for (const donor of records) {
    bloodGroupDistribution[donor.bloodGroup] = (bloodGroupDistribution[donor.bloodGroup] || 0) + 1;

    for (const [label, matcher] of Object.entries(AGE_BANDS)) {
      if (matcher(donor.age)) {
        ageBands[label] += 1;
        break;
      }
    }

    if (donor.availabilityScore < 0.4) availabilityBands.low += 1;
    else if (donor.availabilityScore < 0.7) availabilityBands.medium += 1;
    else availabilityBands.high += 1;
  }

  return {
    bloodGroupDistribution,
    ageBands,
    availabilityBands
  };
}

function buildClusterSummary(records) {
  const clusters = new Map();

  records.forEach((record) => {
    const key = `${record.city || 'Unknown'}|${record.state || 'Unknown'}`;
    if (!clusters.has(key)) {
      clusters.set(key, {
        city: record.city || 'Unknown',
        state: record.state || 'Unknown',
        donors: 0,
        highAvailability: 0,
        rareGroupDonors: 0
      });
    }

    const cluster = clusters.get(key);
    cluster.donors += 1;
    if (record.availabilityScore >= 0.7) cluster.highAvailability += 1;
    if (record.isRareBloodGroup) cluster.rareGroupDonors += 1;
  });

  return Array.from(clusters.values())
    .sort((a, b) => b.donors - a.donors)
    .slice(0, 10);
}

function computeQualityScore(records) {
  if (!records.length) return 0;

  const eligibleRatio = records.filter((r) => r.eligibleNow).length / records.length;
  const highAvailabilityRatio = records.filter((r) => r.availabilityScore >= 0.7).length / records.length;
  const geoCoverage = new Set(records.map((r) => `${r.city}|${r.state}`)).size;

  const score = (eligibleRatio * 45) + (highAvailabilityRatio * 35) + Math.min(geoCoverage, 10) * 2;
  return Number(Math.max(0, Math.min(100, score)).toFixed(2));
}

async function getHospitalsForGeneration(district) {
  const filter = { verificationStatus: 'approved' };
  if (district && district !== 'all') {
    filter.city = new RegExp(`^${district}$`, 'i');
  }

  const hospitals = await HospitalProfile.find(filter)
    .select('hospitalName city state location')
    .lean();

  if (hospitals.length > 0) {
    return hospitals.filter((h) => {
      const coordinates = h?.location?.coordinates || [];
      return coordinates.length === 2;
    });
  }

  return [
    {
      hospitalName: 'City Central Hospital',
      city: district && district !== 'all' ? district : 'Visakhapatnam',
      state: 'Andhra Pradesh',
      location: { coordinates: [83.2185, 17.6868] }
    },
    {
      hospitalName: 'Lifeline Medical Center',
      city: district && district !== 'all' ? district : 'Vijayawada',
      state: 'Andhra Pradesh',
      location: { coordinates: [80.648, 16.5062] }
    },
    {
      hospitalName: 'Metro Blood Care',
      city: district && district !== 'all' ? district : 'Hyderabad',
      state: 'Telangana',
      location: { coordinates: [78.4867, 17.385] }
    }
  ];
}

function generateDonors({ count, seed, district, scenario, includeGeo = true }) {
  const random = createSeededRandom(seed);
  const scenarioModifiers = buildScenarioModifiers(scenario);

  return getHospitalsForGeneration(district).then((hospitals) => {
    const records = [];

    for (let index = 0; index < count; index += 1) {
      const gender = random() > 0.42 ? 'male' : 'female';
      const firstName = gender === 'female' ? pickOne(random, FEMALE_FIRST_NAMES) : pickOne(random, MALE_FIRST_NAMES);
      const lastName = pickOne(random, LAST_NAMES);
      const age = Math.round(randomBetween(random, 18, 61));
      const bloodGroup = pickWeighted(random, BLOOD_GROUP_WEIGHTS);
      const lastDonationGap = Math.round(randomBetween(random, 30, 240));
      const adjustedDonationGap = Math.max(20, lastDonationGap + scenarioModifiers.donationRecencyBiasDays);
      const availabilityScore = computeAvailability(random, age, adjustedDonationGap, scenarioModifiers);
      const eligibleNow = computeEligibility(gender, adjustedDonationGap, scenarioModifiers, random);
      const hospital = pickOne(random, hospitals);
      const [baseLng, baseLat] = hospital.location.coordinates;

      const geo = includeGeo ? createGeoAround(random, baseLng, baseLat) : null;
      const isRareBloodGroup = ['O-', 'A-', 'B-', 'AB-'].includes(bloodGroup);

      records.push({
        syntheticId: `SD-${Date.now().toString(36)}-${String(index + 1).padStart(5, '0')}`,
        fullName: `${firstName} ${lastName}`,
        age,
        gender,
        bloodGroup,
        city: hospital.city || 'Unknown',
        state: hospital.state || 'Unknown',
        linkedHospital: hospital.hospitalName,
        lastDonationDaysAgo: adjustedDonationGap,
        eligibilityWindowDays: gender === 'female' ? 84 : 56,
        eligibleNow,
        availabilityScore: Number(availabilityScore.toFixed(3)),
        preferredSlot: random() > 0.5 ? 'morning' : random() > 0.5 ? 'evening' : 'afternoon',
        responseProbability: Number(Math.max(0.05, Math.min(0.99, availabilityScore + randomBetween(random, -0.12, 0.18))).toFixed(3)),
        isRareBloodGroup,
        location: geo,
        generatedAt: new Date().toISOString()
      });
    }

    const summaryBase = summarizeRecords(records);
    const clusterSummary = buildClusterSummary(records);

    const narrative = [
      `Generated ${count} synthetic donor records for scenario '${scenario}'.`,
      `Coverage spans ${clusterSummary.length || 1} geographic clusters across approved hospitals.`,
      ...scenarioModifiers.notes,
      `Rare blood group records: ${records.filter((r) => r.isRareBloodGroup).length}`
    ];

    return {
      records,
      summary: {
        ...summaryBase,
        clusters: clusterSummary,
        narrative
      },
      qualityScore: computeQualityScore(records)
    };
  });
}

function normalizeRequestPayload(payload = {}) {
  const count = Math.max(10, Math.min(Number(payload.count) || 50, 2000));
  const seed = Number.isFinite(Number(payload.seed)) ? Number(payload.seed) : 42;
  const scenario = ['normal', 'festival', 'outbreak', 'heatwave', 'emergency_drive'].includes(payload.scenario)
    ? payload.scenario
    : 'normal';

  return {
    dataType: 'donors',
    count,
    seed,
    district: typeof payload.district === 'string' && payload.district.trim()
      ? payload.district.trim()
      : 'all',
    includeGeo: payload.includeGeo !== false,
    injectToSystem: payload.injectToSystem === true,
    scenario
  };
}

async function generateSyntheticDonors(payload, user) {
  const request = normalizeRequestPayload(payload);
  const generation = await generateDonors(request);

  const previewRecords = generation.records.slice(0, 25);

  const historyDoc = await SyntheticGeneration.create({
    generatedBy: user?._id || null,
    dataType: request.dataType,
    scenario: request.scenario,
    district: request.district,
    count: request.count,
    seed: request.seed,
    injectedToSystem: request.injectToSystem,
    qualityScore: generation.qualityScore,
    summary: {
      bloodGroupDistribution: generation.summary.bloodGroupDistribution,
      ageBands: generation.summary.ageBands,
      availabilityBands: generation.summary.availabilityBands,
      clusterCount: generation.summary.clusters.length,
      narrative: generation.summary.narrative
    },
    previewRecords
  });

  const responsePayload = {
    success: true,
    generationId: historyDoc._id,
    generatedAt: historyDoc.createdAt,
    generated_count: request.count,
    data_type: request.dataType,
    scenario: request.scenario,
    district: request.district,
    seed: request.seed,
    injected_to_system: request.injectToSystem,
    quality_score: generation.qualityScore,
    summary: generation.summary,
    preview: previewRecords
  };

  broadcast('synthetic_data_generated', {
    generationId: String(historyDoc._id),
    generatedAt: historyDoc.createdAt,
    generatedCount: request.count,
    scenario: request.scenario,
    district: request.district,
    qualityScore: generation.qualityScore
  });

  eventBus.publish('synthetic:generated', {
    generationId: String(historyDoc._id),
    generatedBy: user?._id || null,
    scenario: request.scenario,
    district: request.district,
    count: request.count,
    qualityScore: generation.qualityScore
  });

  return responsePayload;
}

async function getSyntheticPreview(options = {}) {
  const limit = Math.max(5, Math.min(Number(options.limit) || 20, 100));

  let historyDoc = null;
  if (options.generationId) {
    historyDoc = await SyntheticGeneration.findById(options.generationId).lean();
  }

  if (!historyDoc) {
    historyDoc = await SyntheticGeneration.findOne().sort({ createdAt: -1 }).lean();
  }

  if (!historyDoc) {
    return {
      success: true,
      preview: [],
      message: 'No synthetic generations found yet.'
    };
  }

  return {
    success: true,
    generationId: historyDoc._id,
    generatedAt: historyDoc.createdAt,
    dataType: historyDoc.dataType,
    scenario: historyDoc.scenario,
    district: historyDoc.district,
    qualityScore: historyDoc.qualityScore,
    summary: historyDoc.summary,
    preview: (historyDoc.previewRecords || []).slice(0, limit)
  };
}

async function getSyntheticHistory(options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit) || 10, 50));

  const history = await SyntheticGeneration.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('dataType scenario district count seed qualityScore injectedToSystem createdAt generatedBy summary.clusterCount')
    .lean();

  return {
    success: true,
    history: history.map((item) => ({
      id: item._id,
      dataType: item.dataType,
      scenario: item.scenario,
      district: item.district,
      count: item.count,
      seed: item.seed,
      qualityScore: item.qualityScore,
      injectedToSystem: item.injectedToSystem,
      clusterCount: item?.summary?.clusterCount || 0,
      createdAt: item.createdAt,
      generatedBy: item.generatedBy || null
    }))
  };
}

module.exports = {
  generateSyntheticDonors,
  getSyntheticPreview,
  getSyntheticHistory
};
