import numpy as np
from typing import Dict, Any
from app.services.shared_utils import BLOOD_GROUPS


def compute_resilience_score(simulation_results: Dict[str, Any]) -> Dict[str, Any]:
    timeline = simulation_results.get("timeline", [])
    if not timeline:
        return {
            "overall_score": 0.0,
            "supply_stability": 0.0,
            "demand_coverage": 0.0,
            "recovery_speed": 0.0,
            "capacity_buffer": 0.0,
            "risk_rating": "unknown"
        }

    total_units_over_time = [t.get("total_units", 0) for t in timeline]
    fulfilled_over_time = [t.get("demand", {}).get("fulfilled", 0) for t in timeline]
    unmet_over_time = [t.get("demand", {}).get("unmet", 0) for t in timeline]

    mean_units = np.mean(total_units_over_time) if total_units_over_time else 1
    std_units = np.std(total_units_over_time) if total_units_over_time else 0
    supply_stability = max(0, 1.0 - (std_units / max(mean_units, 1)))

    total_fulfilled = sum(fulfilled_over_time)
    total_demand = total_fulfilled + sum(unmet_over_time)
    demand_coverage = total_fulfilled / max(total_demand, 1)

    recovery_speed = 0.5
    if len(total_units_over_time) > 5:
        min_idx = int(np.argmin(total_units_over_time))
        if min_idx < len(total_units_over_time) - 1:
            post_min = total_units_over_time[min_idx + 1:]
            if post_min:
                recovery_ratio = max(post_min) / max(total_units_over_time[min_idx], 1)
                recovery_speed = min(1.0, recovery_ratio / 2.0)

    final_units = total_units_over_time[-1] if total_units_over_time else 0
    capacity_buffer = min(1.0, final_units / max(mean_units, 1))

    overall = round(
        0.30 * supply_stability +
        0.35 * demand_coverage +
        0.20 * recovery_speed +
        0.15 * capacity_buffer, 4
    )

    if overall >= 0.8:
        risk_rating = "low"
    elif overall >= 0.5:
        risk_rating = "moderate"
    elif overall >= 0.3:
        risk_rating = "high"
    else:
        risk_rating = "critical"

    return {
        "overall_score": round(overall, 4),
        "supply_stability": round(supply_stability, 4),
        "demand_coverage": round(demand_coverage, 4),
        "recovery_speed": round(recovery_speed, 4),
        "capacity_buffer": round(capacity_buffer, 4),
        "risk_rating": risk_rating
    }


def compute_blood_group_risk(timeline: list) -> Dict[str, Dict[str, Any]]:
    bg_data = {bg: [] for bg in BLOOD_GROUPS}

    for t in timeline:
        bg_totals = t.get("blood_group_totals", {})
        for bg in BLOOD_GROUPS:
            bg_data[bg].append(bg_totals.get(bg, 0))

    results = {}
    for bg in BLOOD_GROUPS:
        series = bg_data[bg]
        if not series:
            results[bg] = {"avg_stock": 0, "min_stock": 0, "volatility": 0, "shortage_risk": 1.0}
            continue
        avg = np.mean(series)
        minimum = int(np.min(series))
        volatility = np.std(series) / max(avg, 1)
        shortage_risk = min(1.0, max(0, 1.0 - (minimum / max(avg, 1))))
        results[bg] = {
            "avg_stock": round(avg, 1),
            "min_stock": minimum,
            "volatility": round(volatility, 4),
            "shortage_risk": round(shortage_risk, 4)
        }

    return results
