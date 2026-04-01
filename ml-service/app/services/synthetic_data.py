import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid


BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
BLOOD_GROUP_DIST = {"O+": 0.37, "A+": 0.28, "B+": 0.22, "O-": 0.08, "A-": 0.06, "AB+": 0.05, "B-": 0.02, "AB-": 0.01}
URGENCY_LEVELS = ["critical", "high", "medium", "low"]


class SyntheticDataEngine:

    def _generate_donor_profiles(self, count: int, seed: int = 42) -> List[Dict]:
        rng = np.random.RandomState(seed)
        donors = []
        bg_choices = list(BLOOD_GROUP_DIST.keys())
        bg_probs = list(BLOOD_GROUP_DIST.values())
        cities = ["Visakhapatnam", "Vijayawada", "Hyderabad", "Tirupati", "Guntur",
                  "Kakinada", "Rajahmundry", "Nellore", "Warangal", "Kurnool"]
        for i in range(count):
            age = int(rng.normal(35, 10))
            age = max(18, min(65, age))
            blood_group = rng.choice(bg_choices, p=bg_probs)
            weight = round(rng.normal(70, 15), 1)
            weight = max(50, min(120, weight))
            hemoglobin = round(rng.normal(14, 1.5), 1)
            hemoglobin = max(10, min(18, hemoglobin))
            last_donation_days = int(rng.exponential(120))
            total_donations = int(rng.poisson(3))
            donors.append({
                "donor_id": str(uuid.uuid4()),
                "age": age,
                "gender": rng.choice(["Male", "Female"], p=[0.6, 0.4]),
                "blood_group": blood_group,
                "city": rng.choice(cities),
                "weight_kg": weight,
                "hemoglobin": hemoglobin,
                "total_donations": total_donations,
                "days_since_last_donation": last_donation_days,
                "eligible": weight >= 50 and hemoglobin >= 12.5 and last_donation_days >= 56,
                "created_at": (datetime.utcnow() - timedelta(days=rng.randint(1, 730))).isoformat()
            })
        return donors

    def _generate_emergency_requests(self, count: int, hospital_ids: List[str],
                                      seed: int = 42) -> List[Dict]:
        rng = np.random.RandomState(seed)
        requests = []
        bg_choices = list(BLOOD_GROUP_DIST.keys())
        bg_probs = list(BLOOD_GROUP_DIST.values())
        statuses = ["pending", "assigned", "in_transit", "fulfilled", "cancelled"]
        status_probs = [0.15, 0.2, 0.1, 0.45, 0.1]
        for i in range(count):
            urgency = rng.choice(URGENCY_LEVELS, p=[0.15, 0.3, 0.35, 0.2])
            units = int(rng.poisson(3)) + 1
            if urgency == "critical":
                units = max(3, units)
            bg = rng.choice(bg_choices, p=bg_probs)
            created = datetime.utcnow() - timedelta(
                days=rng.randint(0, 180),
                hours=rng.randint(0, 24)
            )
            requests.append({
                "request_id": str(uuid.uuid4()),
                "requestingHospitalId": rng.choice(hospital_ids) if hospital_ids else str(uuid.uuid4()),
                "patientInfo": {
                    "bloodGroup": bg,
                    "age": int(rng.normal(45, 20)),
                    "condition": rng.choice(["Trauma", "Surgery", "Chronic", "Obstetric", "Pediatric"])
                },
                "unitsRequired": units,
                "urgencyLevel": urgency,
                "lifecycleStatus": rng.choice(statuses, p=status_probs),
                "createdAt": created.isoformat(),
                "updatedAt": (created + timedelta(hours=rng.exponential(6))).isoformat()
            })
        return requests

    def _generate_inventory_units(self, count: int, hospital_ids: List[str],
                                   seed: int = 42) -> List[Dict]:
        rng = np.random.RandomState(seed)
        units = []
        bg_choices = list(BLOOD_GROUP_DIST.keys())
        bg_probs = list(BLOOD_GROUP_DIST.values())
        for i in range(count):
            collection_date = datetime.utcnow() - timedelta(days=rng.randint(1, 40))
            expiry_date = collection_date + timedelta(days=42)
            status = "Available"
            if expiry_date < datetime.utcnow():
                status = "Expired"
            elif rng.random() < 0.15:
                status = rng.choice(["Reserved", "Issued", "Quarantine"])
            units.append({
                "unit_id": str(uuid.uuid4()),
                "hospital": rng.choice(hospital_ids) if hospital_ids else str(uuid.uuid4()),
                "bloodGroup": rng.choice(bg_choices, p=bg_probs),
                "component": rng.choice(["Whole Blood", "Packed RBC", "Platelets", "Plasma", "Cryoprecipitate"],
                                        p=[0.3, 0.35, 0.15, 0.12, 0.08]),
                "status": status,
                "collectionDate": collection_date.isoformat(),
                "expiryDate": expiry_date.isoformat(),
                "volume_ml": int(rng.normal(450, 50)),
                "tested": True,
                "donor_id": str(uuid.uuid4())
            })
        return units

    def generate(self, data_type: str, count: int,
                 hospital_ids: Optional[List[str]] = None,
                 seed: int = 42) -> Dict[str, Any]:
        hids = hospital_ids or [str(uuid.uuid4()) for _ in range(5)]
        generators = {
            "donors": self._generate_donor_profiles,
            "emergency_requests": lambda c, s: self._generate_emergency_requests(c, hids, s),
            "inventory": lambda c, s: self._generate_inventory_units(c, hids, s)
        }
        gen = generators.get(data_type)
        if not gen:
            return {
                "error": f"Unknown data type: {data_type}. Available: {list(generators.keys())}",
                "data": [],
                "count": 0
            }
        if data_type == "donors":
            data = gen(count, seed)
        else:
            data = gen(count, seed)
        return {
            "data_type": data_type,
            "data": data,
            "count": len(data),
            "seed": seed,
            "generated_at": datetime.utcnow().isoformat()
        }


synthetic_engine = SyntheticDataEngine()
