import numpy as np
from typing import Dict, List, Any
from app.services.shared_utils import BLOOD_GROUPS


def simulate_daily_demand(state, day: int, demand_multiplier: float = 1.0) -> Dict[str, Any]:
    fulfilled = 0
    unmet = 0
    details = []

    for h_id in list(state.inventory.keys()):
        for bg in BLOOD_GROUPS:
            base_demand = np.random.poisson(2)
            demand = int(base_demand * demand_multiplier)
            consumed = state.consume_units(h_id, bg, demand)
            deficit = demand - consumed
            fulfilled += consumed
            unmet += deficit
            if deficit > 0:
                details.append({"hospital": h_id, "blood_group": bg, "deficit": deficit})

    state.log_event("daily_demand", {
        "day": day, "fulfilled": fulfilled, "unmet": unmet
    })
    return {"fulfilled": fulfilled, "unmet": unmet, "deficit_details": details}


def simulate_daily_supply(state, day: int, supply_rate: float = 1.0) -> Dict[str, Any]:
    total_supplied = 0
    for h_id in list(state.inventory.keys()):
        for bg in BLOOD_GROUPS:
            new_units = np.random.poisson(max(1, int(1.5 * supply_rate)))
            state.add_units(h_id, bg, new_units)
            total_supplied += new_units

    state.log_event("daily_supply", {"day": day, "units_added": total_supplied})
    return {"units_added": total_supplied}


def simulate_disaster_event(state, params: Dict) -> Dict[str, Any]:
    severity = params.get("severity", 0.5)
    affected_fraction = params.get("affected_fraction", 0.3)
    hospital_ids = list(state.inventory.keys())
    affected_count = max(1, int(len(hospital_ids) * affected_fraction))
    affected = list(np.random.choice(hospital_ids, size=min(affected_count, len(hospital_ids)), replace=False))

    total_surge = 0
    for h_id in affected:
        for bg in BLOOD_GROUPS:
            surge = int(np.random.poisson(5) * severity * 3)
            consumed = state.consume_units(h_id, bg, surge)
            total_surge += surge

    state.log_event("disaster", {
        "severity": severity,
        "affected_hospitals": len(affected),
        "surge_demand": total_surge
    })
    return {"affected_hospitals": len(affected), "surge_demand": total_surge}


def simulate_donor_campaign(state, params: Dict) -> Dict[str, Any]:
    reach = params.get("reach", 500)
    conversion = params.get("conversion_rate", 0.05)
    new_donors = np.random.binomial(reach, conversion)
    hospital_ids = list(state.inventory.keys())

    total_donated = 0
    for _ in range(new_donors):
        bg = np.random.choice(BLOOD_GROUPS, p=[0.30, 0.06, 0.25, 0.05, 0.05, 0.02, 0.22, 0.05])
        h_id = np.random.choice(hospital_ids) if hospital_ids else None
        if h_id:
            state.add_units(h_id, bg, 1)
            total_donated += 1

    state.log_event("donor_campaign", {"new_donors": new_donors, "units_donated": total_donated})
    return {"new_donors": new_donors, "units_donated": total_donated}


def simulate_expiry(state, day: int, expiry_rate: float = 0.02) -> Dict[str, Any]:
    total_expired = 0
    for h_id in list(state.inventory.keys()):
        for bg in BLOOD_GROUPS:
            current = state.inventory[h_id].get(bg, 0)
            expired = np.random.binomial(current, expiry_rate)
            state.inventory[h_id][bg] = max(0, current - expired)
            total_expired += expired

    state.log_event("expiry", {"day": day, "expired_units": total_expired})
    return {"expired_units": total_expired}
