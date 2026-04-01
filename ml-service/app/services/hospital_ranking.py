import numpy as np
from datetime import datetime
from typing import Dict, List, Any
from ..db import get_collection
import math


BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

COMPATIBILITY = {
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "AB+": BLOOD_GROUPS,
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"]
}


class HospitalRanker:

    def _fetch_hospitals_with_inventory(self, blood_group: str,
                                         units_needed: int) -> List[Dict]:
        hospitals_col = get_collection("hospitalprofiles")
        hospitals = list(hospitals_col.find({"verificationStatus": "approved"}))
        compatible_groups = COMPATIBILITY.get(blood_group, [blood_group])
        inv_col = get_collection("bloodinventories")
        result = []
        for h in hospitals:
            hospital_id = str(h.get("userId", h.get("_id", "")))
            pipeline = [
                {
                    "$match": {
                        "hospital": hospital_id,
                        "bloodGroup": {"$in": compatible_groups},
                        "status": "Available"
                    }
                },
                {
                    "$group": {
                        "_id": "$bloodGroup",
                        "count": {"$sum": 1},
                        "min_expiry": {"$min": "$expiryDate"}
                    }
                }
            ]
            inv_data = list(inv_col.aggregate(pipeline))
            total_available = sum(d["count"] for d in inv_data)
            if total_available == 0:
                continue
            result.append({
                "hospital_id": hospital_id,
                "hospital_name": h.get("hospitalName", ""),
                "location": h.get("location", {}),
                "coordinates": h.get("coordinates", {}),
                "available_units": total_available,
                "blood_breakdown": {d["_id"]: d["count"] for d in inv_data},
                "registration_number": h.get("registrationNumber", "")
            })
        return result

    def _haversine_distance(self, lat1: float, lon1: float,
                            lat2: float, lon2: float) -> float:
        R = 6371.0
        lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
        lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)
        dlat = lat2_r - lat1_r
        dlon = lon2_r - lon1_r
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _compute_response_time_score(self, hospital_id: str) -> float:
        collection = get_collection("emergencyrequests")
        recent = list(collection.find({
            "assignedHospitalId": hospital_id,
            "lifecycleStatus": "fulfilled"
        }).sort("createdAt", -1).limit(20))
        if not recent:
            return 0.5
        response_times = []
        for r in recent:
            created = r.get("createdAt")
            updated = r.get("updatedAt")
            if created and updated:
                delta = (updated - created).total_seconds() / 3600
                response_times.append(delta)
        if not response_times:
            return 0.5
        avg_time = np.mean(response_times)
        return max(0, min(1, 1 - (avg_time / 24)))

    def _compute_trust_score(self, hospital_id: str) -> float:
        collection = get_collection("emergencyrequests")
        total = collection.count_documents({"assignedHospitalId": hospital_id})
        fulfilled = collection.count_documents({
            "assignedHospitalId": hospital_id,
            "lifecycleStatus": "fulfilled"
        })
        if total == 0:
            return 0.5
        return fulfilled / total

    def rank(self, blood_group: str, urgency: str,
             patient_location: Dict[str, float], units_needed: int,
             max_distance_km: float = 50.0) -> Dict[str, Any]:
        hospitals = self._fetch_hospitals_with_inventory(blood_group, units_needed)
        pat_lat = patient_location.get("lat", 0)
        pat_lon = patient_location.get("lng", patient_location.get("lon", 0))
        scored = []
        for h in hospitals:
            coords = h.get("coordinates", {})
            h_lat = coords.get("lat", coords.get("latitude", 0))
            h_lon = coords.get("lng", coords.get("lon", coords.get("longitude", 0)))
            if h_lat == 0 and h_lon == 0:
                loc = h.get("location", {})
                if isinstance(loc, dict) and "coordinates" in loc:
                    c = loc["coordinates"]
                    if isinstance(c, list) and len(c) >= 2:
                        h_lon, h_lat = c[0], c[1]
            distance = self._haversine_distance(pat_lat, pat_lon, h_lat, h_lon)
            if distance > max_distance_km:
                continue
            distance_score = max(0, 1 - (distance / max_distance_km))
            supply_score = min(1.0, h["available_units"] / max(units_needed, 1))
            response_score = self._compute_response_time_score(h["hospital_id"])
            trust_score = self._compute_trust_score(h["hospital_id"])
            if urgency == "critical":
                weights = {"distance": 0.35, "supply": 0.30, "response": 0.25, "trust": 0.10}
            elif urgency == "high":
                weights = {"distance": 0.30, "supply": 0.30, "response": 0.20, "trust": 0.20}
            elif urgency == "medium":
                weights = {"distance": 0.25, "supply": 0.25, "response": 0.25, "trust": 0.25}
            else:
                weights = {"distance": 0.20, "supply": 0.25, "response": 0.25, "trust": 0.30}
            composite_score = (
                distance_score * weights["distance"] +
                supply_score * weights["supply"] +
                response_score * weights["response"] +
                trust_score * weights["trust"]
            )
            scored.append({
                "hospital_id": h["hospital_id"],
                "hospital_name": h["hospital_name"],
                "distance_km": round(distance, 2),
                "available_units": h["available_units"],
                "blood_breakdown": h["blood_breakdown"],
                "composite_score": round(composite_score, 4),
                "scores": {
                    "distance": round(distance_score, 4),
                    "supply": round(supply_score, 4),
                    "response_time": round(response_score, 4),
                    "trust": round(trust_score, 4)
                }
            })
        scored.sort(key=lambda x: x["composite_score"], reverse=True)
        total_available = sum(h["available_units"] for h in scored)
        fulfillment_prob = min(1.0, total_available / max(units_needed, 1))
        return {
            "ranked_hospitals": scored[:20],
            "total_evaluated": len(hospitals),
            "fulfillment_probability": round(fulfillment_prob, 4),
            "model_version": "gbt-ranking-v1.0",
            "generated_at": datetime.utcnow().isoformat()
        }


hospital_ranker = HospitalRanker()
