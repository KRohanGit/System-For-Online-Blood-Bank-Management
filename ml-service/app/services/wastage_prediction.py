import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
from ..db import get_collection


BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
SHELF_LIFE_DAYS = 42


class WastagePredictor:

    def _fetch_inventory(self, hospital_id: str, blood_group: str = None) -> List[Dict]:
        collection = get_collection("bloodinventories")
        query = {"hospital": hospital_id, "status": "Available"}
        if blood_group:
            query["bloodGroup"] = blood_group
        units = list(collection.find(query).sort("expiryDate", 1))
        return units

    def _fetch_usage_rate(self, hospital_id: str, blood_group: str, days: int = 30) -> float:
        collection = get_collection("bloodtransfers")
        cutoff = datetime.utcnow() - timedelta(days=days)
        count = collection.count_documents({
            "$or": [
                {"fromHospital": hospital_id},
                {"toHospital": hospital_id}
            ],
            "bloodGroup": blood_group,
            "status": "completed",
            "createdAt": {"$gte": cutoff}
        })
        return count / max(days, 1)

    def _compute_wastage_risk(self, unit: Dict, daily_usage: float) -> Dict[str, Any]:
        expiry = unit.get("expiryDate")
        if not expiry:
            return {"risk": 0.5, "days_to_expiry": None}
        if isinstance(expiry, str):
            expiry = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
        days_left = (expiry - datetime.utcnow()).days
        if days_left <= 0:
            return {"risk": 1.0, "days_to_expiry": days_left}
        base_risk = max(0, 1 - (days_left / SHELF_LIFE_DAYS))
        if daily_usage > 0:
            days_to_consume = 1 / daily_usage
            if days_to_consume > days_left:
                usage_factor = min(1.0, (days_to_consume - days_left) / days_left)
            else:
                usage_factor = 0
        else:
            usage_factor = 0.8
        risk = min(1.0, base_risk * 0.6 + usage_factor * 0.4)
        return {"risk": round(risk, 4), "days_to_expiry": days_left}

    def predict(self, hospital_id: str, blood_group: str = None,
                horizon_days: int = 14) -> Dict[str, Any]:
        groups = [blood_group] if blood_group else BLOOD_GROUPS
        at_risk_units = []
        total_wastage_prob = 0
        total_units = 0
        fifo_recommendations = []
        cost_per_unit = 350.0
        for bg in groups:
            units = self._fetch_inventory(hospital_id, bg)
            daily_usage = self._fetch_usage_rate(hospital_id, bg)
            for unit in units:
                risk_info = self._compute_wastage_risk(unit, daily_usage)
                total_units += 1
                total_wastage_prob += risk_info["risk"]
                if risk_info["risk"] > 0.5:
                    at_risk_units.append({
                        "unit_id": str(unit.get("_id", "")),
                        "blood_group": bg,
                        "wastage_risk": risk_info["risk"],
                        "days_to_expiry": risk_info["days_to_expiry"],
                        "collection_date": str(unit.get("collectionDate", "")),
                        "expiry_date": str(unit.get("expiryDate", ""))
                    })
            expiring = [u for u in units if self._days_to_expiry(u) <= horizon_days]
            if expiring:
                fifo_recommendations.append({
                    "blood_group": bg,
                    "units_to_prioritize": len(expiring),
                    "daily_usage_rate": round(daily_usage, 2),
                    "action": "use_first" if daily_usage > 0 else "transfer_recommended",
                    "urgency": "high" if any(self._days_to_expiry(u) <= 3 for u in expiring) else "medium"
                })
        at_risk_units.sort(key=lambda x: x["wastage_risk"], reverse=True)
        avg_wastage = total_wastage_prob / max(total_units, 1)
        potential_waste = len([u for u in at_risk_units if u["wastage_risk"] > 0.7])
        return {
            "hospital_id": hospital_id,
            "at_risk_units": at_risk_units[:50],
            "wastage_probability": round(avg_wastage, 4),
            "fifo_recommendations": fifo_recommendations,
            "cost_impact": {
                "potential_waste_units": potential_waste,
                "estimated_loss": round(potential_waste * cost_per_unit, 2),
                "currency": "INR"
            },
            "model_version": "wastage-regression-v1.0",
            "generated_at": datetime.utcnow().isoformat()
        }

    def _days_to_expiry(self, unit: Dict) -> int:
        expiry = unit.get("expiryDate")
        if not expiry:
            return 999
        if isinstance(expiry, str):
            expiry = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
        return (expiry - datetime.utcnow()).days


wastage_predictor = WastagePredictor()
