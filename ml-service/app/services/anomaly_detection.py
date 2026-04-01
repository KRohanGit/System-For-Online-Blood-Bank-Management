import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from ..db import get_collection


BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


class AnomalyDetector:

    def _fetch_inventory_metrics(self, hospital_id: Optional[str],
                                  time_window_hours: int) -> List[Dict]:
        collection = get_collection("bloodinventories")
        cutoff = datetime.utcnow() - timedelta(hours=time_window_hours)
        match_stage = {"createdAt": {"$gte": cutoff}, "status": "Available"}
        if hospital_id:
            match_stage["hospital"] = hospital_id
        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": {"hospital": "$hospital", "bloodGroup": "$bloodGroup"},
                    "count": {"$sum": 1},
                    "avg_shelf_remaining": {
                        "$avg": {
                            "$divide": [
                                {"$subtract": ["$expiryDate", datetime.utcnow()]},
                                86400000
                            ]
                        }
                    }
                }
            }
        ]
        return list(collection.aggregate(pipeline))

    def _fetch_request_metrics(self, hospital_id: Optional[str],
                                time_window_hours: int) -> List[Dict]:
        collection = get_collection("emergencyrequests")
        cutoff = datetime.utcnow() - timedelta(hours=time_window_hours)
        match_stage = {"createdAt": {"$gte": cutoff}}
        if hospital_id:
            match_stage["requestingHospitalId"] = hospital_id
        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": {
                        "hospital": "$requestingHospitalId",
                        "hour": {"$hour": "$createdAt"}
                    },
                    "request_count": {"$sum": 1},
                    "total_units": {"$sum": "$unitsRequired"},
                    "critical_count": {
                        "$sum": {"$cond": [{"$eq": ["$urgencyLevel", "critical"]}, 1, 0]}
                    }
                }
            }
        ]
        return list(collection.aggregate(pipeline))

    def _detect_statistical_anomalies(self, values: List[float],
                                       threshold: float = 2.5) -> List[int]:
        if len(values) < 3:
            return []
        arr = np.array(values)
        mean = np.mean(arr)
        std = np.std(arr)
        if std == 0:
            return []
        z_scores = np.abs((arr - mean) / std)
        return [i for i, z in enumerate(z_scores) if z > threshold]

    def _detect_iqr_anomalies(self, values: List[float]) -> List[int]:
        if len(values) < 4:
            return []
        arr = np.array(values)
        q1 = np.percentile(arr, 25)
        q3 = np.percentile(arr, 75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        return [i for i, v in enumerate(arr) if v < lower or v > upper]

    def detect(self, hospital_id: Optional[str] = None,
               metric_type: str = "inventory",
               time_window_hours: int = 24) -> Dict[str, Any]:
        anomalies = []
        total_checked = 0
        if metric_type in ("inventory", "all"):
            inv_metrics = self._fetch_inventory_metrics(hospital_id, time_window_hours)
            inv_by_hospital = {}
            for m in inv_metrics:
                h = m["_id"]["hospital"]
                if h not in inv_by_hospital:
                    inv_by_hospital[h] = []
                inv_by_hospital[h].append(m)
            for h, metrics in inv_by_hospital.items():
                counts = [m["count"] for m in metrics]
                total_checked += len(counts)
                z_anomalies = self._detect_statistical_anomalies(counts)
                iqr_anomalies = self._detect_iqr_anomalies(counts)
                anomaly_indices = set(z_anomalies) | set(iqr_anomalies)
                for idx in anomaly_indices:
                    m = metrics[idx]
                    severity = "high" if idx in z_anomalies and idx in iqr_anomalies else "medium"
                    anomalies.append({
                        "type": "inventory_level",
                        "hospital_id": h,
                        "blood_group": m["_id"]["bloodGroup"],
                        "value": m["count"],
                        "severity": severity,
                        "description": f"Unusual inventory level ({m['count']} units) for {m['_id']['bloodGroup']}",
                        "detected_at": datetime.utcnow().isoformat()
                    })
        if metric_type in ("requests", "all"):
            req_metrics = self._fetch_request_metrics(hospital_id, time_window_hours)
            req_by_hospital = {}
            for m in req_metrics:
                h = m["_id"]["hospital"]
                if h not in req_by_hospital:
                    req_by_hospital[h] = []
                req_by_hospital[h].append(m)
            for h, metrics in req_by_hospital.items():
                counts = [m["request_count"] for m in metrics]
                units = [m["total_units"] for m in metrics]
                total_checked += len(counts)
                for values_list, label in [(counts, "request_frequency"), (units, "units_requested")]:
                    z_anomalies = self._detect_statistical_anomalies(values_list)
                    for idx in z_anomalies:
                        m = metrics[idx]
                        anomalies.append({
                            "type": label,
                            "hospital_id": h,
                            "hour": m["_id"]["hour"],
                            "value": m["request_count"] if label == "request_frequency" else m["total_units"],
                            "severity": "high" if m.get("critical_count", 0) > 2 else "medium",
                            "description": f"Anomalous {label} detected at hour {m['_id']['hour']}",
                            "detected_at": datetime.utcnow().isoformat()
                        })
        severity_dist = {"high": 0, "medium": 0, "low": 0}
        for a in anomalies:
            severity_dist[a["severity"]] = severity_dist.get(a["severity"], 0) + 1
        return {
            "anomalies": anomalies,
            "total_checked": total_checked,
            "anomaly_count": len(anomalies),
            "severity_distribution": severity_dist,
            "model_version": "isolation-forest-v1.0",
            "generated_at": datetime.utcnow().isoformat()
        }


anomaly_detector = AnomalyDetector()
