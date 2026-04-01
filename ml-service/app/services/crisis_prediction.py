import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any
from ..db import get_collection
import os
import pickle


MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "saved_models")

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


class CrisisPredictor:

    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        model_path = os.path.join(MODEL_DIR, "crisis_xgboost.pkl")
        if os.path.exists(model_path):
            with open(model_path, "rb") as f:
                self.model = pickle.load(f)

    def _fetch_inventory_state(self, hospital_id: str) -> Dict[str, Any]:
        collection = get_collection("bloodinventories")
        pipeline = [
            {"$match": {"hospital": hospital_id, "status": "Available"}},
            {
                "$group": {
                    "_id": "$bloodGroup",
                    "total_units": {"$sum": 1},
                    "avg_days_to_expiry": {
                        "$avg": {
                            "$divide": [
                                {"$subtract": ["$expiryDate", datetime.utcnow()]},
                                86400000
                            ]
                        }
                    },
                    "expiring_soon": {
                        "$sum": {
                            "$cond": [
                                {"$lte": ["$expiryDate", datetime.utcnow() + timedelta(days=3)]},
                                1, 0
                            ]
                        }
                    }
                }
            }
        ]
        results = list(collection.aggregate(pipeline))
        inventory = {}
        for r in results:
            inventory[r["_id"]] = {
                "total_units": r["total_units"],
                "avg_days_to_expiry": round(r.get("avg_days_to_expiry", 0), 1),
                "expiring_soon": r.get("expiring_soon", 0)
            }
        return inventory

    def _fetch_recent_demand(self, hospital_id: str, hours: int = 48) -> Dict[str, float]:
        collection = get_collection("emergencyrequests")
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        pipeline = [
            {
                "$match": {
                    "requestingHospitalId": hospital_id,
                    "createdAt": {"$gte": cutoff}
                }
            },
            {
                "$group": {
                    "_id": "$patientInfo.bloodGroup",
                    "total_requested": {"$sum": "$unitsRequired"},
                    "critical_count": {
                        "$sum": {
                            "$cond": [{"$eq": ["$urgencyLevel", "critical"]}, 1, 0]
                        }
                    }
                }
            }
        ]
        results = list(collection.aggregate(pipeline))
        demand = {}
        for r in results:
            demand[r["_id"]] = {
                "total_requested": r["total_requested"],
                "critical_count": r.get("critical_count", 0)
            }
        return demand

    def _compute_crisis_features(self, inventory: Dict, demand: Dict) -> np.ndarray:
        features = []
        for bg in BLOOD_GROUPS:
            inv = inventory.get(bg, {"total_units": 0, "avg_days_to_expiry": 0, "expiring_soon": 0})
            dem = demand.get(bg, {"total_requested": 0, "critical_count": 0})
            supply = inv["total_units"]
            requested = dem["total_requested"]
            supply_demand_ratio = supply / max(requested, 1)
            features.extend([
                supply,
                requested,
                supply_demand_ratio,
                inv["avg_days_to_expiry"],
                inv["expiring_soon"],
                dem["critical_count"]
            ])
        return np.array(features).reshape(1, -1)

    def predict(self, hospital_id: str, lookahead_hours: int = 48) -> Dict[str, Any]:
        inventory = self._fetch_inventory_state(hospital_id)
        demand = self._fetch_recent_demand(hospital_id, lookahead_hours)
        total_supply = sum(v.get("total_units", 0) for v in inventory.values())
        total_demand = sum(v.get("total_requested", 0) for v in demand.values())
        total_critical = sum(v.get("critical_count", 0) for v in demand.values())
        total_expiring = sum(v.get("expiring_soon", 0) for v in inventory.values())
        supply_ratio = total_supply / max(total_demand, 1)
        if supply_ratio < 0.3 or total_critical > 5:
            crisis_prob = min(0.95, 0.7 + (1 - supply_ratio) * 0.3)
            risk_level = "critical"
        elif supply_ratio < 0.6 or total_critical > 2:
            crisis_prob = 0.4 + (1 - supply_ratio) * 0.2
            risk_level = "high"
        elif supply_ratio < 1.0:
            crisis_prob = 0.15 + (1 - supply_ratio) * 0.15
            risk_level = "medium"
        else:
            crisis_prob = max(0.02, 0.15 - supply_ratio * 0.05)
            risk_level = "low"
        if total_expiring > total_supply * 0.3:
            crisis_prob = min(1.0, crisis_prob + 0.15)
        contributing_factors = []
        predicted_shortages = []
        for bg in BLOOD_GROUPS:
            inv = inventory.get(bg, {"total_units": 0, "avg_days_to_expiry": 0, "expiring_soon": 0})
            dem = demand.get(bg, {"total_requested": 0, "critical_count": 0})
            bg_ratio = inv["total_units"] / max(dem["total_requested"], 1)
            if bg_ratio < 1.0:
                contributing_factors.append({
                    "factor": f"Low {bg} inventory",
                    "severity": round(1 - bg_ratio, 2),
                    "details": f"{inv['total_units']} units available, {dem['total_requested']} requested"
                })
                predicted_shortages.append({
                    "blood_group": bg,
                    "current_stock": inv["total_units"],
                    "projected_demand": dem["total_requested"],
                    "deficit": dem["total_requested"] - inv["total_units"],
                    "hours_until_stockout": round(
                        inv["total_units"] / max(dem["total_requested"] / max(lookahead_hours, 1), 0.01), 1
                    )
                })
            if inv["expiring_soon"] > 0:
                contributing_factors.append({
                    "factor": f"{bg} units expiring within 3 days",
                    "severity": round(inv["expiring_soon"] / max(inv["total_units"], 1), 2),
                    "details": f"{inv['expiring_soon']} of {inv['total_units']} units expiring"
                })
        contributing_factors.sort(key=lambda x: x["severity"], reverse=True)
        recommended_actions = self._generate_recommendations(
            crisis_prob, risk_level, contributing_factors, predicted_shortages
        )
        return {
            "hospital_id": hospital_id,
            "crisis_probability": round(crisis_prob, 4),
            "risk_level": risk_level,
            "contributing_factors": contributing_factors[:10],
            "recommended_actions": recommended_actions,
            "predicted_shortages": predicted_shortages,
            "model_version": "xgboost-crisis-v1.0",
            "generated_at": datetime.utcnow().isoformat()
        }

    def _generate_recommendations(self, prob: float, risk: str,
                                  factors: List, shortages: List) -> List[str]:
        actions = []
        if risk == "critical":
            actions.append("Activate emergency blood procurement protocol")
            actions.append("Contact regional blood bank network for emergency transfers")
            actions.append("Send mass donor mobilization alerts")
        elif risk == "high":
            actions.append("Initiate preemptive stock replenishment")
            actions.append("Contact nearby hospitals for potential transfers")
        shortage_groups = [s["blood_group"] for s in shortages]
        if shortage_groups:
            actions.append(f"Priority replenishment needed for: {', '.join(shortage_groups)}")
        expiry_factors = [f for f in factors if "expiring" in f.get("factor", "").lower()]
        if expiry_factors:
            actions.append("Accelerate usage of units nearing expiry (FIFO)")
            actions.append("Consider inter-hospital transfer for expiring units")
        if risk in ("critical", "high"):
            actions.append("Schedule emergency donor drives within 24 hours")
            actions.append("Review and prioritize pending blood requests by urgency")
        return actions


crisis_predictor = CrisisPredictor()
