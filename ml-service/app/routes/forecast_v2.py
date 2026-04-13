from datetime import datetime, timedelta
import math
import os
from typing import Dict, List, Any

import numpy as np
from fastapi import APIRouter, HTTPException, Query
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/ml/v2/forecast", tags=["Forecast V2"])

BLOOD_BASE = {
    "O+": 26,
    "O-": 11,
    "A+": 21,
    "A-": 9,
    "B+": 18,
    "B-": 8,
    "AB+": 12,
    "AB-": 6,
}

AUGMENTATION_STATE: Dict[str, Dict[str, Any]] = {}
BAYESIAN_STATE: Dict[str, Dict[str, float]] = {}


def _meta(model_version: str, confidence: float) -> Dict[str, Any]:
    return {
        "model_version": model_version,
        "generated_at": datetime.utcnow().isoformat(),
        "confidence_level": confidence,
    }


def _db_collection():
    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
    if not mongo_uri:
        return None
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=1500)
        db = client.get_default_database() or client["lifelink"]
        return db["ml_v2_forecast_logs"]
    except Exception:
        return None


def _audit(feature: str, hospital_id: str, payload: Dict[str, Any]):
    col = _db_collection()
    if col is None:
        return
    try:
        col.insert_one({
            "feature": feature,
            "hospitalId": hospital_id,
            "timestamp": datetime.utcnow(),
            "payload": payload,
        })
    except Exception:
        pass


@router.post("/causal-analysis")
async def causal_analysis(body: Dict[str, Any]):
    try:
        blood_group = body.get("bloodGroup", "O+")
        hospital_id = body.get("hospitalId", "unknown")
        rainfall = float(body.get("rainfall", 0.4))
        festival_proximity = float(body.get("festivalProximity", 0.2))
        icu_occupancy = float(body.get("icuOccupancy", 0.6))

        weather_effect = max(0.0, min(1.0, 0.18 + rainfall * 0.45))
        festival_effect = max(0.0, min(1.0, 0.1 + festival_proximity * 0.35))
        icu_effect = max(0.0, min(1.0, 0.12 + icu_occupancy * 0.3))
        baseline = max(0.05, 1 - (weather_effect + festival_effect + icu_effect))

        total = weather_effect + festival_effect + icu_effect + baseline
        contributions = {
            "weather": round(weather_effect / total, 2),
            "festival": round(festival_effect / total, 2),
            "icuOccupancy": round(icu_effect / total, 2),
            "baseline": round(baseline / total, 2),
        }

        dominant = max(contributions, key=contributions.get)
        dominant_label = {
            "weather": "Heavy rainfall + weekend",
            "festival": "Festival crowding and mobility surge",
            "icuOccupancy": "High ICU occupancy and critical load",
            "baseline": "Baseline cyclical hospital demand",
        }[dominant]

        base = BLOOD_BASE.get(blood_group, 14)
        no_rain = int(round(base * (1 + contributions["festival"] + contributions["icuOccupancy"])))
        with_rain = int(round(base * (1 + contributions["weather"] + contributions["festival"] + contributions["icuOccupancy"])))
        pct_lower = 0 if with_rain == 0 else int(round(((with_rain - no_rain) / with_rain) * 100))

        result = {
            "bloodGroup": blood_group,
            "dominantCause": dominant_label,
            "causalContributions": contributions,
            "counterfactual": f"If no rain, demand would have been {pct_lower}% lower",
            "interventionSuggestion": "Schedule donation camp on predicted high-demand day",
            "whatIfPrediction": {
                "withRain": with_rain,
                "withoutRain": no_rain,
            },
            **_meta("causal-v2.1", 0.9),
        }
        _audit("causal-analysis", hospital_id, result)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/bayesian/update")
async def bayesian_update(body: Dict[str, Any]):
    blood_group = body.get("bloodGroup", "O+")
    actual_units = float(body.get("actualUnits", 0))

    state = BAYESIAN_STATE.get(blood_group, {"mean": BLOOD_BASE.get(blood_group, 14), "n": 1.0, "var": 9.0})
    n = state["n"] + 1.0
    mean = state["mean"] + (actual_units - state["mean"]) / n
    var = max(1.0, (state["var"] * (n - 1) + (actual_units - mean) ** 2) / n)
    BAYESIAN_STATE[blood_group] = {"mean": mean, "n": n, "var": var}

    result = {
        "bloodGroup": blood_group,
        "updatedPosterior": {"mean": round(mean, 2), "variance": round(var, 2), "observations": int(n)},
        "status": "posterior_updated",
        **_meta("bayesian-v2.1", 0.93),
    }
    _audit("bayesian-update", body.get("hospitalId", "unknown"), result)
    return result


@router.get("/bayesian/predict")
async def bayesian_predict(bloodGroup: str = Query("O+"), horizon: int = Query(7)):
    horizon = max(1, min(int(horizon), 30))
    state = BAYESIAN_STATE.get(bloodGroup, {"mean": BLOOD_BASE.get(bloodGroup, 14), "n": 6.0, "var": 16.0})

    samples = np.random.normal(loc=state["mean"], scale=max(1.0, math.sqrt(state["var"])), size=(1000, horizon))
    samples = np.clip(samples, 0, None)

    mean = samples.mean(axis=0).round(2).tolist()
    lower95 = np.percentile(samples, 2.5, axis=0).round(2).tolist()
    upper95 = np.percentile(samples, 97.5, axis=0).round(2).tolist()
    lower50 = np.percentile(samples, 25, axis=0).round(2).tolist()
    upper50 = np.percentile(samples, 75, axis=0).round(2).tolist()

    reason = "Sparse data for AB-" if bloodGroup in ["AB-", "B-", "A-"] else "Stable posterior with moderate variance"

    return {
        "bloodGroup": bloodGroup,
        "horizon": horizon,
        "mean": mean,
        "credibleInterval95": {"lower": lower95, "upper": upper95},
        "credibleInterval50": {"lower": lower50, "upper": upper50},
        "posteriorSamples": 1000,
        "uncertaintyReason": reason,
        **_meta("bayesian-v2.1", 0.94),
    }


@router.get("/epi-coupling/active-alerts")
async def epi_active_alerts(hospitalId: str = Query("unknown")):
    outbreaks = [
        {"disease": "dengue_fever", "trend": "rising", "impact": "Platelets +140% next 10 days"},
        {"disease": "malaria", "trend": "stable", "impact": "PackedRBC +35%"},
    ]
    result = {
        "hospitalId": hospitalId,
        "district": "Demo District",
        "activeOutbreaks": outbreaks,
        "alerts": ["Monsoon PPH season begins in 3 weeks - stock FFP now"],
        **_meta("epi-coupling-v2.0", 0.88),
    }
    _audit("epi-active-alerts", hospitalId, result)
    return result


@router.post("/epi-coupling/adjust")
async def epi_adjust(body: Dict[str, Any]):
    forecast_data = body.get("forecastData", [])
    active_outbreaks = body.get("activeOutbreaks", [])
    uplift = 1.0
    for item in active_outbreaks:
        disease = item.get("disease", "")
        if disease == "dengue_fever":
            uplift += 0.6
        elif disease == "malaria":
            uplift += 0.4
        elif disease == "snake_bite":
            uplift += 0.5

    adjusted = []
    for row in forecast_data:
        v = float(row.get("predictedUnits", row.get("predicted_units", 0)))
        adjusted.append({
            **row,
            "epiAdjustedUnits": round(v * uplift, 2),
            "upliftFactor": round(uplift, 2),
        })

    return {
        "adjustedForecast": adjusted,
        "outbreakAnnotations": active_outbreaks,
        **_meta("epi-coupling-v2.0", 0.87),
    }


@router.get("/rare-group-augmentation/status")
async def rare_status(hospitalId: str = Query("unknown")):
    rows = []
    for bg in ["AB-", "B-", "A-"]:
        state = AUGMENTATION_STATE.get(bg, {})
        real = int(state.get("realSamples", np.random.randint(8, 40)))
        synth = int(state.get("syntheticSamples", real * 3))
        rows.append({
            "bloodGroup": bg,
            "realSamples": real,
            "syntheticSamples": synth,
            "modelAccuracy": round(min(0.96, 0.72 + synth / max(real + synth, 1) * 0.2), 3),
            "lastAugmented": state.get("lastAugmented", datetime.utcnow().isoformat()),
            "augmentationActive": real < 50,
        })
    result = {"hospitalId": hospitalId, "groups": rows, **_meta("timegan-lite-v2.0", 0.81)}
    _audit("rare-status", hospitalId, result)
    return result


@router.post("/rare-group-augmentation/trigger")
async def rare_trigger(body: Dict[str, Any]):
    bg = body.get("bloodGroup", "AB-")
    real = int(body.get("realSamples", np.random.randint(8, 30)))
    synth = real * 3
    AUGMENTATION_STATE[bg] = {
        "realSamples": real,
        "syntheticSamples": synth,
        "lastAugmented": datetime.utcnow().isoformat(),
    }
    return {
        "bloodGroup": bg,
        "realSamples": real,
        "syntheticSamples": synth,
        "augmentationActive": True,
        "status": "triggered",
        **_meta("timegan-lite-v2.0", 0.8),
    }


@router.post("/monte-carlo-stress/run")
async def monte_carlo_run(body: Dict[str, Any]):
    scenario = body.get("scenario", "SCENARIO_A")
    n = int(body.get("simulations", 10000))
    rng = np.random.default_rng(seed=42)

    shock = {
        "SCENARIO_A": 1.0,
        "SCENARIO_B": 1.3,
        "SCENARIO_C": 2.0,
        "SCENARIO_D": 1.8,
        "SCENARIO_E": 1.5,
        "SCENARIO_F": 2.2,
    }.get(scenario, 1.2)

    outputs = {}
    for bg in ["O-", "AB-", "Platelets"]:
        base = 8 if bg == "AB-" else 11 if bg == "O-" else 25
        demand = rng.normal(loc=base * shock, scale=max(2, base * 0.3), size=n)
        inventory = rng.normal(loc=base * 1.3, scale=max(2, base * 0.2), size=n)
        stockout = (demand > inventory).mean()
        outputs[bg] = round(float(stockout), 2)

    result = {
        "scenario": scenario,
        "simulations": n,
        "stockoutProbability": outputs,
        "expectedStockoutDay": {"O-": 4, "AB-": 2},
        "p10DaysOfSupply": {"O-": 1.2},
        "p90DaysOfSupply": {"O-": 8.4},
        "recommendedBufferUnits": {"O-": 12, "AB-": 4, "Platelets": 18},
        "cascadeRisk": ["O- -> O+ substitution pressure on day 3"],
        **_meta("montecarlo-v2.0", 0.91),
    }
    _audit("monte-carlo", body.get("hospitalId", "unknown"), result)
    return result


@router.get("/circadian")
async def circadian(bloodGroup: str = Query("O+"), hours: int = Query(24)):
    hours = max(24, min(int(hours), 72))
    base = BLOOD_BASE.get(bloodGroup, 14) / 10.0
    now = datetime.utcnow()
    rows: List[Dict[str, Any]] = []

    for i in range(hours):
        t = now + timedelta(hours=i)
        hour = t.hour
        dow = t.weekday()

        circadian_wave = 1 + 0.45 * math.sin((2 * math.pi * hour) / 24)
        weekend_trauma = 1.25 if dow in [4, 5] and hour in [22, 23, 0, 1, 2] else 1.0
        elective = 1.2 if dow in [0, 1, 2, 3, 4] and 7 <= hour <= 12 else 0.95
        demand = round(max(0.2, base * circadian_wave * weekend_trauma * elective), 2)

        category = "trauma_peak" if weekend_trauma > 1 else "elective_window" if elective > 1 else "baseline"
        rows.append({
            "hour": t.isoformat(),
            "predictedUnits": demand,
            "demandCategory": category,
            "staffingRecommendation": "Ensure on-call technician available" if category == "trauma_peak" else "Standard staffing",
            "urgencyWindow": category == "trauma_peak",
        })

    return {"bloodGroup": bloodGroup, "curve": rows, **_meta("circadian-v2.0", 0.86)}


@router.get("/supply-demand-coforecast/gap-analysis")
async def gap_analysis(hospitalId: str = Query("unknown"), weeks: int = Query(6)):
    weeks = max(1, min(int(weeks), 12))
    rows = []
    for i in range(weeks):
        week = f"Week {i + 1}"
        for bg in ["O+", "O-", "A+", "AB-"]:
            demand = BLOOD_BASE.get(bg, 10) + i + (2 if bg in ["O-", "AB-"] else 0)
            supply = max(1, demand - np.random.randint(0, 5))
            gap = demand - supply
            severity = "critical" if gap >= 4 else "moderate" if gap >= 2 else "safe"
            rows.append({
                "week": week,
                "bloodGroup": bg,
                "forecastedDemand": int(demand),
                "forecastedSupply": int(supply),
                "gap": int(gap),
                "gapSeverity": severity,
            })

    return {"hospitalId": hospitalId, "rows": rows, **_meta("coforecast-v2.0", 0.89)}


@router.post("/supply-demand-coforecast/optimize-recruitment")
async def optimize_recruitment(body: Dict[str, Any]):
    budget = float(body.get("budget", 50000))
    actions = [
        {
            "action": "Run corporate camp at HITEC City",
            "week": "Week 2",
            "expectedYield": {"O+": 45},
            "cost": 12000,
            "costPerUnit": 266.67,
        },
        {
            "action": "SMS 320 lapsed O- donors",
            "week": "Week 1",
            "expectedYield": {"O-": 18},
            "cost": 2800,
            "costPerUnit": 155.56,
        },
        {
            "action": "Weekend platelet apheresis drive",
            "week": "Week 3",
            "expectedYield": {"Platelets": 22},
            "cost": 9000,
            "costPerUnit": 409.09,
        },
    ]

    selected = []
    spent = 0
    for action in actions:
        if spent + action["cost"] <= budget:
            selected.append(action)
            spent += action["cost"]

    expected_yield = int(sum(sum(v.values()) for v in [a["expectedYield"] for a in selected]))
    gap_closure = min(95, 40 + expected_yield)

    return {
        "recommendedActions": selected,
        "expectedYield": expected_yield,
        "gapClosurePercent": gap_closure,
        "costPerUnit": round(spent / max(expected_yield, 1), 2),
        "timeline": "1-3 weeks",
        **_meta("coforecast-v2.0", 0.88),
    }
