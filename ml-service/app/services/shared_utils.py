import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Optional
from app.db import get_collection

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

BLOOD_COMPATIBILITY = {
    "O-": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "O+": ["A+", "B+", "AB+", "O+"],
    "A-": ["A+", "A-", "AB+", "AB-"],
    "A+": ["A+", "AB+"],
    "B-": ["B+", "B-", "AB+", "AB-"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB+", "AB-"],
    "AB+": ["AB+"]
}


def fetch_hospital_data() -> List[Dict]:
    collection = get_collection("hospitalprofiles")
    return list(collection.find({}, {
        "_id": 1, "name": 1, "location": 1, "city": 1,
        "state": 1, "address": 1, "phone": 1
    }).limit(200))


def fetch_inventory_data() -> List[Dict]:
    collection = get_collection("bloodinventories")
    return list(collection.find({}).limit(500))


def fetch_emergency_data(limit: int = 1000) -> List[Dict]:
    collection = get_collection("emergencyrequests")
    return list(collection.find({}).sort("createdAt", -1).limit(limit))


def fetch_donation_data(limit: int = 2000) -> List[Dict]:
    collection = get_collection("donations")
    return list(collection.find({}).sort("donationDate", -1).limit(limit))


def build_hospital_inventory_map() -> Dict[str, Dict[str, int]]:
    inventories = fetch_inventory_data()
    hospital_map = {}
    for inv in inventories:
        h_id = str(inv.get("hospitalId", inv.get("hospital", "")))
        if h_id not in hospital_map:
            hospital_map[h_id] = {bg: 0 for bg in BLOOD_GROUPS}
        bg = inv.get("bloodGroup", inv.get("blood_group", ""))
        units = inv.get("units", inv.get("quantity", 0))
        if bg in BLOOD_GROUPS:
            hospital_map[h_id][bg] += int(units)
    return hospital_map


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    lat1_r, lon1_r = np.radians(lat1), np.radians(lon1)
    lat2_r, lon2_r = np.radians(lat2), np.radians(lon2)
    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1_r) * np.cos(lat2_r) * np.sin(dlon / 2) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c


def extract_hospital_coords(hospital: Dict) -> Optional[Dict[str, float]]:
    loc = hospital.get("location", {})
    if isinstance(loc, dict):
        coords = loc.get("coordinates", [])
        if isinstance(coords, list) and len(coords) >= 2:
            return {"lat": coords[1], "lng": coords[0]}
        lat = loc.get("lat", loc.get("latitude"))
        lng = loc.get("lng", loc.get("longitude", loc.get("lon")))
        if lat and lng:
            return {"lat": float(lat), "lng": float(lng)}
    return None


def timestamp() -> str:
    return datetime.utcnow().isoformat()
