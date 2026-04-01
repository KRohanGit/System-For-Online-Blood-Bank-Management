import {
  BLOOD_TYPES,
  COMPONENT_SHELF_LIFE_DAYS,
  COMPONENTS,
  WARD_LOCATIONS,
} from './constants';
import {
  addDays,
  choose,
  createId,
  daysBetween,
  getShelfLifeDays,
  getUnitCostUsd,
  randomBetween,
  randomInt,
  toMonthString,
} from './utils';

function buildBloodUnit({
  bloodType,
  component,
  ageDays,
  location,
  collectionSource = 'internal_donor',
  status = 'available',
  now = new Date(),
}) {
  const shelfLife = getShelfLifeDays(component);
  const storageStart = addDays(now, -ageDays);
  const processedDate = addDays(storageStart, -1);
  const collectedDate = addDays(processedDate, -1);
  const expiryDate = addDays(storageStart, shelfLife);
  return {
    unit_id: createId('BU'),
    blood_type: bloodType,
    component,
    collected_date: collectedDate.toISOString(),
    processed_date: processedDate.toISOString(),
    storage_start_date: storageStart.toISOString(),
    expiry_date: expiryDate.toISOString(),
    shelf_life_days: shelfLife,
    current_location: location,
    status,
    collection_source: collectionSource,
    age_days: ageDays,
    days_remaining: daysBetween(now, expiryDate),
    estimated_unit_value_usd: getUnitCostUsd(bloodType, component),
  };
}

export function generateMockBloodUnits(now = new Date()) {
  const units = [];

  // 5 critical risk: old, main_bank, rare types.
  const rareTypes = ['AB-', 'B-', 'A-'];
  for (let i = 0; i < 5; i += 1) {
    units.push(buildBloodUnit({
      bloodType: choose(rareTypes),
      component: i % 2 === 0 ? 'red_cells' : 'platelets',
      ageDays: randomInt(36, 41),
      location: 'main_bank',
      now,
    }));
  }

  // 8 high risk: 28-35 days in ward locations.
  const highWardPool = ['ward_a', 'ward_b', 'main_bank'];
  for (let i = 0; i < 8; i += 1) {
    units.push(buildBloodUnit({
      bloodType: choose(BLOOD_TYPES),
      component: choose(['red_cells', 'red_cells', 'platelets']),
      ageDays: randomInt(28, 35),
      location: choose(highWardPool),
      now,
    }));
  }

  // 12 medium risk: 18-28 mixed.
  for (let i = 0; i < 12; i += 1) {
    units.push(buildBloodUnit({
      bloodType: choose(BLOOD_TYPES),
      component: choose(COMPONENTS),
      ageDays: randomInt(18, 28),
      location: choose(WARD_LOCATIONS),
      now,
    }));
  }

  // 20 low risk: age < 18.
  for (let i = 0; i < 20; i += 1) {
    units.push(buildBloodUnit({
      bloodType: choose(BLOOD_TYPES),
      component: choose(COMPONENTS),
      ageDays: randomInt(1, 17),
      location: choose(WARD_LOCATIONS),
      now,
    }));
  }

  // Ensure at least 3 platelets with age >3 critical context.
  let plateletsAged = units.filter((u) => u.component === 'platelets' && u.age_days > 3);
  while (plateletsAged.length < 3) {
    units.push(buildBloodUnit({
      bloodType: choose(BLOOD_TYPES),
      component: 'platelets',
      ageDays: randomInt(4, 5),
      location: choose(['ward_b', 'main_bank']),
      now,
    }));
    plateletsAged = units.filter((u) => u.component === 'platelets' && u.age_days > 3);
  }

  return units.slice(0, 45);
}

export function generateMockDispensingTransactions(units, now = new Date()) {
  const transactions = [];
  const shifts = ['morning', 'afternoon', 'night'];

  for (let i = 0; i < 200; i += 1) {
    const dayBack = randomInt(0, 29);
    const date = addDays(now, -dayBack);
    const isWardBNight = i < 60;
    const isIcuAfternoon = i >= 60 && i < 100;

    const ward = isWardBNight ? 'ward_b' : isIcuAfternoon ? 'icu' : choose(['ward_a', 'ward_b', 'or', 'emergency', 'main_bank']);
    const shift = isWardBNight ? 'night' : isIcuAfternoon ? 'afternoon' : choose(shifts);

    let oldestAvailable = randomInt(18, 40);
    let dispensedAge = oldestAvailable - randomInt(0, 4);

    if (isWardBNight && Math.random() < 0.4) {
      dispensedAge = oldestAvailable - randomInt(8, 14);
    }

    if (isIcuAfternoon && Math.random() < 0.25) {
      dispensedAge = oldestAvailable - randomInt(4, 8);
    }

    const ageGap = Math.max(0, oldestAvailable - dispensedAge);
    const compliant = dispensedAge >= oldestAvailable - 3;

    transactions.push({
      transaction_id: createId('TXN'),
      dispensed_unit_id: choose(units).unit_id,
      dispensed_unit_age_days: dispensedAge,
      blood_type: choose(BLOOD_TYPES),
      ward,
      dispensed_by: `staff_${randomInt(1, 24)}`,
      dispensed_at: date.toISOString(),
      shift,
      oldest_available_age_days: oldestAvailable,
      fifo_compliant: compliant,
      age_gap_days: ageGap,
    });
  }

  return transactions;
}

export function generateMockWardConfigs() {
  const maxTemplate = { 'O+': 40, 'O-': 30, 'A+': 30, 'A-': 16, 'B+': 24, 'B-': 16, 'AB+': 16, 'AB-': 8 };
  return [
    {
      ward: 'main_bank',
      min_safe_stock: { 'O+': 10, 'O-': 8, 'A+': 8, 'A-': 4, 'B+': 6, 'B-': 4, 'AB+': 4, 'AB-': 2 },
      max_capacity: maxTemplate,
      transfer_time_hours_to: { icu: 1, or: 1, emergency: 1, ward_a: 2, ward_b: 2, main_bank: 0 },
      compatible_blood_types: BLOOD_TYPES,
    },
    {
      ward: 'icu',
      min_safe_stock: { 'O+': 4, 'O-': 4, 'A+': 3, 'A-': 2, 'B+': 2, 'B-': 1, 'AB+': 1, 'AB-': 1 },
      max_capacity: { 'O+': 12, 'O-': 12, 'A+': 10, 'A-': 6, 'B+': 8, 'B-': 6, 'AB+': 6, 'AB-': 4 },
      transfer_time_hours_to: { main_bank: 1, or: 1, emergency: 1, ward_a: 2, ward_b: 2, icu: 0 },
      compatible_blood_types: BLOOD_TYPES,
    },
    {
      ward: 'or',
      min_safe_stock: { 'O+': 6, 'O-': 6, 'A+': 4, 'A-': 3, 'B+': 3, 'B-': 2, 'AB+': 2, 'AB-': 1 },
      max_capacity: { 'O+': 20, 'O-': 20, 'A+': 14, 'A-': 8, 'B+': 12, 'B-': 8, 'AB+': 8, 'AB-': 4 },
      transfer_time_hours_to: { main_bank: 1, icu: 1, emergency: 1, ward_a: 2, ward_b: 2, or: 0 },
      compatible_blood_types: BLOOD_TYPES,
    },
    {
      ward: 'ward_a',
      min_safe_stock: { 'O+': 3, 'O-': 2, 'A+': 2, 'A-': 1, 'B+': 2, 'B-': 1, 'AB+': 1, 'AB-': 1 },
      max_capacity: { 'O+': 10, 'O-': 8, 'A+': 8, 'A-': 4, 'B+': 8, 'B-': 4, 'AB+': 4, 'AB-': 2 },
      transfer_time_hours_to: { main_bank: 2, icu: 2, or: 2, emergency: 2, ward_b: 1, ward_a: 0 },
      compatible_blood_types: BLOOD_TYPES,
    },
    {
      ward: 'ward_b',
      min_safe_stock: { 'O+': 3, 'O-': 2, 'A+': 2, 'A-': 1, 'B+': 2, 'B-': 1, 'AB+': 1, 'AB-': 1 },
      max_capacity: { 'O+': 10, 'O-': 8, 'A+': 8, 'A-': 4, 'B+': 8, 'B-': 4, 'AB+': 4, 'AB-': 2 },
      transfer_time_hours_to: { main_bank: 2, icu: 2, or: 2, emergency: 2, ward_a: 1, ward_b: 0 },
      compatible_blood_types: BLOOD_TYPES,
    },
    {
      ward: 'emergency',
      min_safe_stock: { 'O+': 5, 'O-': 5, 'A+': 3, 'A-': 2, 'B+': 3, 'B-': 2, 'AB+': 2, 'AB-': 1 },
      max_capacity: { 'O+': 16, 'O-': 16, 'A+': 12, 'A-': 8, 'B+': 10, 'B-': 8, 'AB+': 8, 'AB-': 4 },
      transfer_time_hours_to: { main_bank: 1, icu: 1, or: 1, ward_a: 2, ward_b: 2, emergency: 0 },
      compatible_blood_types: BLOOD_TYPES,
    },
  ];
}

export function generateMockBloodUnitEvents(units, now = new Date()) {
  const events = [];
  const eventTypes = ['DONATED', 'TESTED', 'PROCESSED', 'STORED', 'ISSUED', 'TRANSFUSED'];

  units.forEach((unit, idx) => {
    const base = addDays(now, -randomInt(2, 58));
    const isFridayCollected = new Date(base).getDay() === 5;
    const isExternal = unit.collection_source === 'external_supplier';
    const isPlatelet = unit.component === 'platelets';

    let cursor = new Date(base);

    const donated = {
      event_id: createId('EVT'),
      unit_id: unit.unit_id,
      event_type: 'DONATED',
      timestamp: cursor.toISOString(),
      location: isExternal ? 'supplier_hub' : 'donor_center',
      performed_by: 'collection_staff',
      duration_hours: 1.2,
    };
    events.push(donated);

    const testDelay = isFridayCollected ? randomBetween(22, 34) : randomBetween(10, 16);
    cursor = addDays(cursor, testDelay / 24);
    events.push({
      event_id: createId('EVT'),
      unit_id: unit.unit_id,
      event_type: 'TESTED',
      timestamp: cursor.toISOString(),
      location: 'testing_lab',
      performed_by: 'lab_technician',
      duration_hours: testDelay,
    });

    if (isPlatelet && Math.random() < 0.18) {
      const retestDelay = randomBetween(16, 28);
      cursor = addDays(cursor, retestDelay / 24);
      events.push({
        event_id: createId('EVT'),
        unit_id: unit.unit_id,
        event_type: 'RETESTED',
        timestamp: cursor.toISOString(),
        location: 'testing_lab',
        performed_by: 'qc_reviewer',
        duration_hours: retestDelay,
      });
    }

    const processDelay = randomBetween(4, 10) + (isExternal ? 18 : 0);
    cursor = addDays(cursor, processDelay / 24);
    events.push({
      event_id: createId('EVT'),
      unit_id: unit.unit_id,
      event_type: 'PROCESSED',
      timestamp: cursor.toISOString(),
      location: 'processing_unit',
      performed_by: 'processing_staff',
      duration_hours: processDelay,
    });

    const storageDelay = randomBetween(1, 6) + (isExternal ? 8 : 0);
    cursor = addDays(cursor, storageDelay / 24);
    events.push({
      event_id: createId('EVT'),
      unit_id: unit.unit_id,
      event_type: 'STORED',
      timestamp: cursor.toISOString(),
      location: unit.current_location,
      performed_by: 'storage_operator',
      duration_hours: storageDelay,
    });

    if (idx % 2 === 0) {
      const issueDelay = randomBetween(4, 48);
      cursor = addDays(cursor, issueDelay / 24);
      events.push({
        event_id: createId('EVT'),
        unit_id: unit.unit_id,
        event_type: choose(['ISSUED', 'TRANSFERRED']),
        timestamp: cursor.toISOString(),
        location: choose(['icu', 'or', 'ward_a', 'ward_b', 'emergency']),
        performed_by: 'coordinator',
        duration_hours: issueDelay,
      });
    }

    if (idx % 9 === 0) {
      events.push({
        event_id: createId('EVT'),
        unit_id: unit.unit_id,
        event_type: choose(['EXPIRED', 'DISCARDED']),
        timestamp: addDays(cursor, randomBetween(0.5, 2)).toISOString(),
        location: unit.current_location,
        performed_by: 'quality_manager',
        duration_hours: 0,
      });
    }
  });

  // Keep around 300 events.
  return events.slice(0, 300);
}

export function generateMockPurchaseOrders(now = new Date()) {
  const orders = [];
  for (let i = 0; i < 80; i += 1) {
    const dayBack = randomInt(0, 89);
    const date = addDays(now, -dayBack);
    const dow = date.getDay();
    const wom = Math.ceil(date.getDate() / 7);

    let bloodType = choose(BLOOD_TYPES);
    let overRatio = randomBetween(1.0, 1.6);

    if (i < 18) {
      bloodType = choose(['O+', 'A+']);
      overRatio = randomBetween(1.8, 2.4);
    } else if (i < 30) {
      bloodType = choose(['AB-', 'B-']);
      overRatio = randomBetween(2.5, 4.0);
    } else if (i < 42) {
      overRatio = randomBetween(1.6, 2.0);
    } else if (i < 50) {
      bloodType = 'O-';
      overRatio = randomBetween(1.4, 1.7);
    }

    const consumed = randomInt(4, 18);
    const ordered = Math.max(1, Math.round(consumed * overRatio));
    const expired = Math.max(0, randomInt(0, Math.floor((ordered - consumed) * 0.8)));

    orders.push({
      po_id: createId('PO'),
      order_date: date.toISOString(),
      blood_type: bloodType,
      component: choose(['red_cells', 'platelets', 'plasma']),
      units_ordered: ordered,
      units_received: Math.max(0, ordered - randomInt(0, 2)),
      units_consumed_in_window: consumed,
      units_expired_from_order: expired,
      over_order_ratio: Number((ordered / Math.max(1, consumed)).toFixed(2)),
      ordered_by: `role_${randomInt(1, 5)}`,
      day_of_week: dow,
      week_of_month: wom,
      reason_code: Math.random() < 0.35 ? 'PRECAUTIONARY' : null,
    });
  }
  return orders;
}

export function generateMockWasteRecords(now = new Date()) {
  const records = [];
  const baseMonths = 12;
  const monthLabels = [];
  for (let i = 0; i < baseMonths; i += 1) {
    const d = new Date(now);
    d.setMonth(now.getMonth() - (baseMonths - 1 - i));
    monthLabels.push(toMonthString(d));
  }

  const monthlyTotals = [3120, 2880, 1840, 2960, 3340, 2870, 3010, 3520, 2710, 4020, 5120, 3010];

  monthLabels.forEach((month, idx) => {
    BLOOD_TYPES.forEach((bloodType) => {
      const total = monthlyTotals[idx] / BLOOD_TYPES.length;
      const unitsExpired = Math.max(1, Math.round(total / 220 + randomBetween(-2, 2)));
      const fifoPct = Number(randomBetween(72, 94).toFixed(1));
      const overOrderRatio = Number(randomBetween(1.05, 2.2).toFixed(2));
      const flowScore = Number(randomBetween(58, 90).toFixed(1));
      const avgAge = Number(randomBetween(1.2, 4.2).toFixed(2));
      const demandVar = Number(randomBetween(1.5, 8.5).toFixed(2));

      const c1 = Number(randomBetween(0.15, 0.35).toFixed(2));
      const c2 = Number(randomBetween(0.2, 0.4).toFixed(2));
      const c3 = Number(randomBetween(0.1, 0.25).toFixed(2));
      const c4 = Number(randomBetween(0.08, 0.2).toFixed(2));
      const sum = c1 + c2 + c3 + c4;
      const unpreventable = Number(Math.max(0.03, 1 - sum).toFixed(2));

      records.push({
        record_id: createId('WR'),
        month,
        blood_type: bloodType,
        component: choose(['red_cells', 'platelets', 'plasma']),
        units_expired: unitsExpired,
        waste_cost_usd: Number(total.toFixed(2)),
        cause_attribution: {
          fifo_violation_pct: c1,
          over_ordering_pct: c2,
          flow_delay_pct: c3,
          low_demand_pct: c4,
          unpreventable_pct: unpreventable,
        },
        fifo_compliance_pct: fifoPct,
        over_order_ratio: overOrderRatio,
        flow_efficiency_score: flowScore,
        avg_age_on_storage: avgAge,
        demand_variance: demandVar,
      });
    });
  });

  return records;
}

export function generateMockWeeklyReportHistory(now = new Date()) {
  const values = [3200, 2900, 3100, 3650];
  return values.map((waste, idx) => {
    const weekEnding = addDays(now, -(3 - idx) * 7);
    const summary = idx === 0
      ? 'Main issue: FIFO in Ward B declining'
      : idx === 1
        ? 'Improvement from coordinator awareness'
        : idx === 2
          ? 'New bottleneck found in Friday processing'
          : 'Trend worsening with projected 3900 monthly';
    return {
      report_id: createId('WQR'),
      generated_at: addDays(weekEnding, -1).toISOString(),
      week_ending: weekEnding.toISOString(),
      generated_by: 'scheduled',
      requested_by: null,
      report_text: `EXECUTIVE SUMMARY\nWeekly waste cost ${waste} USD.\nKEY FINDINGS THIS WEEK\n${summary}`,
      data_snapshot: {
        financial: { actual_waste_this_week_usd: waste, projected_month_total_usd: idx === 3 ? 3900 : 3500 },
      },
      acknowledged_by: [],
      acknowledged_at: null,
      actions_committed: [],
    };
  });
}
