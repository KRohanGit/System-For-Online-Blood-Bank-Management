import numpy as np
from typing import Dict, List, Any
from app.services.shared_utils import (
    BLOOD_GROUPS, BLOOD_COMPATIBILITY, fetch_hospital_data,
    build_hospital_inventory_map, fetch_emergency_data,
    haversine_distance, extract_hospital_coords, timestamp
)


class DigitalTwinState:
    def __init__(self, hospitals: List[Dict], inventory_map: Dict[str, Dict[str, int]]):
        self.hospitals = hospitals
        self.inventory = {}
        for h in hospitals:
            h_id = str(h.get("_id", ""))
            self.inventory[h_id] = dict(inventory_map.get(h_id, {bg: 0 for bg in BLOOD_GROUPS}))
        self.event_log = []
        self.time_step = 0

    def get_total_units(self) -> int:
        total = 0
        for h_inv in self.inventory.values():
            total += sum(h_inv.values())
        return total

    def get_blood_group_totals(self) -> Dict[str, int]:
        totals = {bg: 0 for bg in BLOOD_GROUPS}
        for h_inv in self.inventory.values():
            for bg in BLOOD_GROUPS:
                totals[bg] += h_inv.get(bg, 0)
        return totals

    def consume_units(self, hospital_id: str, blood_group: str, units: int) -> int:
        available = self.inventory.get(hospital_id, {}).get(blood_group, 0)
        consumed = min(available, units)
        if hospital_id in self.inventory:
            self.inventory[hospital_id][blood_group] = available - consumed
        return consumed

    def add_units(self, hospital_id: str, blood_group: str, units: int):
        if hospital_id not in self.inventory:
            self.inventory[hospital_id] = {bg: 0 for bg in BLOOD_GROUPS}
        self.inventory[hospital_id][blood_group] = self.inventory[hospital_id].get(blood_group, 0) + units

    def log_event(self, event_type: str, details: Dict):
        self.event_log.append({
            "step": self.time_step,
            "type": event_type,
            "details": details
        })

    def snapshot(self) -> Dict[str, Any]:
        return {
            "time_step": self.time_step,
            "total_units": self.get_total_units(),
            "blood_group_totals": self.get_blood_group_totals(),
            "hospital_count": len(self.hospitals),
            "events_count": len(self.event_log)
        }
