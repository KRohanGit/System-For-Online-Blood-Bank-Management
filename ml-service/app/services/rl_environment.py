import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any
from app.services.shared_utils import BLOOD_GROUPS, fetch_emergency_data, fetch_donation_data
from app.db import get_collection


class BloodAllocationEnv:
    def __init__(self, hospital_ids: List[str], inventory_map: Dict[str, Dict[str, int]],
                 demand_pattern: Dict[str, float] = None):
        self.hospital_ids = hospital_ids
        self.n_hospitals = len(hospital_ids)
        self.inventory = {}
        for h_id in hospital_ids:
            self.inventory[h_id] = dict(inventory_map.get(h_id, {bg: 0 for bg in BLOOD_GROUPS}))
        
        # Fetch real demand patterns from hospital data instead of using synthetic defaults
        self.demand_pattern = self._calculate_real_demand_pattern() or (demand_pattern or {bg: 2.0 for bg in BLOOD_GROUPS})
        
        # Fetch real expiration rates and supply patterns
        self.real_expiration_rate = self._calculate_real_expiration_rate()
        self.real_supply_rate = self._calculate_real_supply_rate()
        
        self.step_count = 0
        self.max_steps = 30
        self.episode_reward = 0
        self.fulfilled_total = 0
        self.wasted_total = 0
        self.unmet_total = 0
        
        # Real data tracking
        self.emergency_data = fetch_emergency_data(limit=1000)
        self.donation_data = fetch_donation_data(limit=2000)

    def get_state(self) -> np.ndarray:
        state_vec = []
        for h_id in self.hospital_ids:
            for bg in BLOOD_GROUPS:
                state_vec.append(self.inventory[h_id].get(bg, 0))
        state_vec.append(self.step_count / self.max_steps)
        return np.array(state_vec, dtype=np.float32)

    @property
    def state_dim(self) -> int:
        return self.n_hospitals * len(BLOOD_GROUPS) + 1

    @property
    def action_dim(self) -> int:
        return self.n_hospitals * self.n_hospitals * len(BLOOD_GROUPS)

    def decode_action(self, action_idx: int) -> Dict[str, Any]:
        n_bg = len(BLOOD_GROUPS)
        pair_idx = action_idx // n_bg
        bg_idx = action_idx % n_bg
        from_idx = pair_idx // self.n_hospitals
        to_idx = pair_idx % self.n_hospitals
        from_idx = min(from_idx, self.n_hospitals - 1)
        to_idx = min(to_idx, self.n_hospitals - 1)
        return {
            "from_hospital": self.hospital_ids[from_idx],
            "to_hospital": self.hospital_ids[to_idx],
            "blood_group": BLOOD_GROUPS[bg_idx],
            "units": 1
        }

    def step(self, action_idx: int) -> tuple:
        action = self.decode_action(action_idx)
        reward = 0.0

        from_h = action["from_hospital"]
        to_h = action["to_hospital"]
        bg = action["blood_group"]
        units = action["units"]

        if from_h != to_h and self.inventory[from_h].get(bg, 0) >= units:
            self.inventory[from_h][bg] -= units
            self.inventory[to_h][bg] = self.inventory[to_h].get(bg, 0) + units
            reward += 0.5

        step_fulfilled = 0
        step_unmet = 0
        
        # Use REAL demand patterns from hospital data instead of synthetic random poisson
        for h_id in self.hospital_ids:
            for bg_d in BLOOD_GROUPS:
                # Use real average demand - scaled by hospital variation
                real_demand_rate = self.demand_pattern.get(bg_d, 2.0)
                demand = max(0, int(real_demand_rate + np.random.normal(0, real_demand_rate * 0.2)))
                
                available = self.inventory[h_id].get(bg_d, 0)
                consumed = min(available, demand)
                self.inventory[h_id][bg_d] = available - consumed
                step_fulfilled += consumed
                step_unmet += (demand - consumed)

        self.fulfilled_total += step_fulfilled
        self.unmet_total += step_unmet
        reward += step_fulfilled * 0.1
        reward -= step_unmet * 0.3

        for h_id in self.hospital_ids:
            for bg_e in BLOOD_GROUPS:
                current = self.inventory[h_id].get(bg_e, 0)
                # Use REAL expiration rate from hospital data instead of synthetic
                expired = np.random.binomial(current, self.real_expiration_rate)
                self.inventory[h_id][bg_e] = max(0, current - expired)
                self.wasted_total += expired
                reward -= expired * 0.2

        for h_id in self.hospital_ids:
            for bg_s in BLOOD_GROUPS:
                # Use REAL supply rate from hospital donation patterns instead of synthetic
                supply = max(0, int(self.real_supply_rate + np.random.normal(0, self.real_supply_rate * 0.2)))
                self.inventory[h_id][bg_s] = self.inventory[h_id].get(bg_s, 0) + supply

        self.step_count += 1
        self.episode_reward += reward
        done = self.step_count >= self.max_steps
        return self.get_state(), reward, done

    def reset(self, inventory_map: Dict[str, Dict[str, int]]) -> np.ndarray:
        for h_id in self.hospital_ids:
            self.inventory[h_id] = dict(inventory_map.get(h_id, {bg: 0 for bg in BLOOD_GROUPS}))
        self.step_count = 0
        self.episode_reward = 0
        self.fulfilled_total = 0
        self.wasted_total = 0
        self.unmet_total = 0
        return self.get_state()

    def get_metrics(self) -> Dict[str, Any]:
        total_stock = sum(
            sum(inv.values()) for inv in self.inventory.values()
        )
        return {
            "total_stock": total_stock,
            "fulfilled": self.fulfilled_total,
            "unmet": self.unmet_total,
            "wasted": self.wasted_total,
            "episode_reward": round(self.episode_reward, 2),
            "steps": self.step_count
        }

    def _calculate_real_demand_pattern(self) -> Dict[str, float]:
        """Calculate real demand patterns from emergency request data"""
        try:
            collection = get_collection("emergencyrequests")
            demand_stats = {}
            
            for bg in BLOOD_GROUPS:
                # Aggregate historical demand for each blood group across all hospitals
                pipeline = [
                    {
                        "$match": {
                            "patientInfo.bloodGroup": bg,
                            "createdAt": {"$gte": datetime.utcnow() - timedelta(days=90)}
                        }
                    },
                    {
                        "$group": {
                            "_id": None,
                            "total_units": {"$sum": "$unitsRequired"},
                            "count": {"$sum": 1}
                        }
                    }
                ]
                results = list(collection.aggregate(pipeline))
                if results:
                    avg_demand = results[0]["total_units"] / max(results[0]["count"], 1) / max(len(self.hospital_ids), 1)
                    demand_stats[bg] = max(0.5, avg_demand)  # Minimum 0.5 units per hospital
                else:
                    demand_stats[bg] = 2.0  # Default fallback
            
            return demand_stats
        except Exception as e:
            print(f"Error calculating real demand pattern: {e}")
            return None

    def _calculate_real_expiration_rate(self) -> float:
        """Calculate average blood expiration rate from hospital inventory data"""
        try:
            collection = get_collection("bloodinventories")
            # Calculate expired vs total units ratio from inventory history
            stats = list(collection.aggregate([
                {
                    "$group": {
                        "_id": None,
                        "avg_expiration_ratio": {"$avg": {
                            "$cond": [
                                {"$gt": ["$units", 0]},
                                {"$divide": ["$expiredUnits", "$units"]},
                                0
                            ]
                        }}
                    }
                }
            ]))
            
            if stats and stats[0].get("avg_expiration_ratio"):
                rate = min(float(stats[0]["avg_expiration_ratio"]), 0.10)  # Cap at 10%
                return max(rate, 0.01)  # Minimum 1% expiration rate
            return 0.02  # Default 2% daily expiration
        except Exception as e:
            print(f"Error calculating real expiration rate: {e}")
            return 0.02

    def _calculate_real_supply_rate(self) -> float:
        """Calculate average blood supply rate from donation data"""
        try:
            collection = get_collection("donations")
            # Calculate daily supply per hospital from donation history
            stats = list(collection.aggregate([
                {
                    "$match": {
                        "donationDate": {"$gte": datetime.utcnow() - timedelta(days=90)}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total_donations": {"$sum": 1},
                        "total_units": {"$sum": 1}  # Each donation typically = 1 unit
                    }
                }
            ]))
            
            if stats:
                # Convert to daily rate per hospital
                total_units = stats[0].get("total_units", 0)
                days = 90
                hospitals = max(len(self.hospital_ids), 1)
                daily_supply_per_hospital = total_units / (days * hospitals) if days > 0 else 1.5
                return max(0.5, daily_supply_per_hospital)
            return 1.5  # Default supply rate
        except Exception as e:
            print(f"Error calculating real supply rate: {e}")
            return 1.5
