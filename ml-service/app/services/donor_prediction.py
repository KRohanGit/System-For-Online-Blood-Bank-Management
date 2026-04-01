import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
from ..db import get_collection


class DonorReturnPredictor:

    def _fetch_donor_data(self, donor_id: str) -> Dict[str, Any]:
        users_col = get_collection("publicusers")
        donor = users_col.find_one({"_id": donor_id})
        if not donor:
            donor = users_col.find_one({"userId": donor_id})
        donations_col = get_collection("donationappointments")
        donations = list(donations_col.find(
            {"donor": donor_id}
        ).sort("appointmentDate", -1))
        return {"profile": donor, "donations": donations}

    def _compute_donor_features(self, profile: Dict, donations: List) -> Dict[str, float]:
        total_donations = len(donations)
        if total_donations == 0:
            return {
                "total_donations": 0,
                "avg_interval_days": 0,
                "days_since_last": 999,
                "consistency_score": 0,
                "recency_score": 0,
                "frequency_score": 0,
                "engagement_score": 0
            }
        dates = []
        for d in donations:
            dt = d.get("appointmentDate") or d.get("createdAt")
            if isinstance(dt, str):
                dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            if dt:
                dates.append(dt)
        dates.sort()
        intervals = []
        for i in range(1, len(dates)):
            delta = (dates[i] - dates[i - 1]).days
            intervals.append(delta)
        avg_interval = np.mean(intervals) if intervals else 365
        days_since_last = (datetime.utcnow() - dates[-1]).days if dates else 999
        consistency_score = 0
        if intervals:
            std_interval = np.std(intervals)
            consistency_score = max(0, 1 - (std_interval / max(avg_interval, 1)))
        recency_score = max(0, 1 - (days_since_last / 365))
        frequency_score = min(1.0, total_donations / 10)
        engagement_score = (recency_score * 0.4 + frequency_score * 0.35 + consistency_score * 0.25)
        return {
            "total_donations": total_donations,
            "avg_interval_days": round(avg_interval, 1),
            "days_since_last": days_since_last,
            "consistency_score": round(consistency_score, 4),
            "recency_score": round(recency_score, 4),
            "frequency_score": round(frequency_score, 4),
            "engagement_score": round(engagement_score, 4)
        }

    def predict(self, donor_id: str, donation_history: List[Dict] = None,
                demographics: Dict = None) -> Dict[str, Any]:
        data = self._fetch_donor_data(donor_id)
        profile = data["profile"] or {}
        donations = data["donations"] if data["donations"] else (donation_history or [])
        features = self._compute_donor_features(profile, donations)
        eng = features["engagement_score"]
        recency = features["recency_score"]
        freq = features["frequency_score"]
        return_prob = (eng * 0.5 + recency * 0.3 + freq * 0.2)
        return_prob = min(1.0, max(0.0, return_prob))
        if features["days_since_last"] > 365:
            return_prob *= 0.5
        elif features["days_since_last"] > 180:
            return_prob *= 0.75
        if features["total_donations"] >= 5:
            return_prob = min(1.0, return_prob * 1.2)
        expected_return = None
        if return_prob > 0.3 and features["avg_interval_days"] > 0:
            next_days = max(56, features["avg_interval_days"])
            expected_date = datetime.utcnow() + timedelta(days=next_days - features["days_since_last"])
            if expected_date > datetime.utcnow():
                expected_return = expected_date.strftime("%Y-%m-%d")
        if return_prob >= 0.7:
            churn_risk = "low"
        elif return_prob >= 0.4:
            churn_risk = "medium"
        else:
            churn_risk = "high"
        suggestions = self._generate_retention_suggestions(
            features, return_prob, churn_risk
        )
        return {
            "donor_id": donor_id,
            "return_probability": round(return_prob, 4),
            "expected_return_date": expected_return,
            "engagement_score": features["engagement_score"],
            "churn_risk": churn_risk,
            "retention_suggestions": suggestions,
            "model_version": "logistic-donor-v1.0",
            "generated_at": datetime.utcnow().isoformat()
        }

    def _generate_retention_suggestions(self, features: Dict, prob: float,
                                        risk: str) -> List[str]:
        suggestions = []
        if features["days_since_last"] > 180:
            suggestions.append("Send personalized re-engagement notification")
        if features["days_since_last"] > 90:
            suggestions.append("Remind donor about upcoming blood camp in their area")
        if risk == "high":
            suggestions.append("Offer flexible scheduling with multiple time slots")
            suggestions.append("Send impact story showing lives saved by donations")
        if features["total_donations"] >= 3 and risk != "low":
            suggestions.append("Acknowledge donor milestone and thank for continued support")
        if features["consistency_score"] < 0.5:
            suggestions.append("Suggest setting up recurring donation reminders")
        if features["total_donations"] == 0:
            suggestions.append("Send first-time donor welcome guide")
            suggestions.append("Pair with an experienced donor for buddy program")
        if not suggestions:
            suggestions.append("Maintain regular communication cadence")
            suggestions.append("Share community impact updates")
        return suggestions


donor_return_predictor = DonorReturnPredictor()
