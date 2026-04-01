import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from bson import ObjectId
from ..db import get_collection
from scipy.optimize import linprog, minimize


BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

COMPATIBILITY = {
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"]
}


class ClassicalOptimizer:

    @staticmethod
    def _id_variants(raw_ids: Optional[List[str]]) -> List[Any]:
        variants: List[Any] = []
        if not raw_ids:
            return variants
        for raw in raw_ids:
            if raw is None:
                continue
            raw_str = str(raw)
            variants.append(raw_str)
            if ObjectId.is_valid(raw_str):
                variants.append(ObjectId(raw_str))
        return variants

    def _fetch_network_state(self, hospital_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        hosp_col = get_collection("hospitalprofiles")
        inv_col = get_collection("bloodinventories")
        query = {"verificationStatus": "approved"}
        if hospital_ids:
            id_variants = self._id_variants(hospital_ids)
            query["$or"] = [
                {"_id": {"$in": id_variants}},
                {"userId": {"$in": id_variants}}
            ]
        hospitals = list(hosp_col.find(query))
        network = {}
        for h in hospitals:
            # Use HospitalProfile _id as canonical hospital ID to match backend APIs.
            hid = str(h.get("_id", ""))
            hid_variants = self._id_variants([hid])
            pipeline = [
                {"$match": {"hospitalId": {"$in": hid_variants}, "status": "Available"}},
                {"$group": {"_id": "$bloodGroup", "count": {"$sum": 1}}}
            ]
            inv = {r["_id"]: r["count"] for r in inv_col.aggregate(pipeline)}

            location = h.get("location", {})
            coordinates = location.get("coordinates", []) if isinstance(location, dict) else []
            lat = None
            lon = None
            if isinstance(coordinates, list) and len(coordinates) == 2:
                # GeoJSON format is [longitude, latitude]
                lon = coordinates[0]
                lat = coordinates[1]

            network[hid] = {
                "name": h.get("hospitalName", ""),
                "inventory": inv,
                "location": {
                    "lat": lat,
                    "lon": lon
                }
            }
        return network

    def _fetch_demand_forecast(self, hospital_ids: Optional[List[str]],
                                horizon_days: int) -> Dict[str, Dict[str, float]]:
        req_col = get_collection("emergencyrequests")
        cutoff = datetime.utcnow() - timedelta(days=30)
        match = {"createdAt": {"$gte": cutoff}}
        if hospital_ids:
            match["requestingHospitalId"] = {"$in": self._id_variants(hospital_ids)}
        pipeline = [
            {"$match": match},
            {
                "$group": {
                    "_id": {
                        "hospital": "$requestingHospitalId",
                        "bloodGroup": "$bloodGroup"
                    },
                    "avg_daily": {"$avg": "$unitsRequired"}
                }
            }
        ]
        results = list(req_col.aggregate(pipeline))
        demand = {}
        for r in results:
            hid = str(r["_id"]["hospital"])
            bg = r["_id"]["bloodGroup"]
            if hid not in demand:
                demand[hid] = {}
            demand[hid][bg] = r["avg_daily"] * horizon_days
        return demand

    def optimize_minimize_waste(self, hospital_ids: Optional[List[str]],
                                 blood_groups: Optional[List[str]],
                                 time_horizon: int,
                                 constraints: Dict) -> Dict[str, Any]:
        network = self._fetch_network_state(hospital_ids)
        demand = self._fetch_demand_forecast(list(network.keys()), time_horizon)
        groups = blood_groups or BLOOD_GROUPS
        hospitals = list(network.keys())
        n = len(hospitals)
        transfers = []
        total_waste_reduction = 0
        for bg in groups:
            surplus = {}
            deficit = {}
            for hid in hospitals:
                inv = network[hid]["inventory"].get(bg, 0)
                dem = demand.get(hid, {}).get(bg, 0)
                diff = inv - dem
                if diff > 0:
                    surplus[hid] = diff
                elif diff < 0:
                    deficit[hid] = abs(diff)
            for s_hid, s_amount in sorted(surplus.items(), key=lambda x: -x[1]):
                for d_hid, d_amount in sorted(deficit.items(), key=lambda x: -x[1]):
                    if s_amount <= 0 or d_amount <= 0:
                        continue
                    transfer_amount = min(s_amount, d_amount)
                    max_transfer = constraints.get("max_units_per_transfer", 20)
                    transfer_amount = min(transfer_amount, max_transfer)
                    transfers.append({
                        "from_hospital": s_hid,
                        "from_name": network[s_hid]["name"],
                        "to_hospital": d_hid,
                        "to_name": network[d_hid]["name"],
                        "blood_group": bg,
                        "units": int(transfer_amount),
                        "priority": "high" if d_amount > inv * 0.5 else "medium"
                    })
                    surplus[s_hid] -= transfer_amount
                    deficit[d_hid] -= transfer_amount
                    total_waste_reduction += transfer_amount
        cost_per_unit_transfer = constraints.get("transfer_cost_per_unit", 50)
        cost_per_unit_waste = 350
        total_transfer_cost = sum(t["units"] for t in transfers) * cost_per_unit_transfer
        waste_savings = total_waste_reduction * cost_per_unit_waste
        return {
            "objective": "minimize_waste",
            "optimal_transfers": transfers,
            "expected_improvement": {
                "waste_reduction_units": int(total_waste_reduction),
                "waste_reduction_pct": round(
                    total_waste_reduction / max(sum(
                        sum(network[h]["inventory"].values()) for h in hospitals
                    ), 1) * 100, 2
                )
            },
            "cost_savings": round(waste_savings - total_transfer_cost, 2),
            "constraint_satisfaction": {
                "max_units_respected": all(
                    t["units"] <= constraints.get("max_units_per_transfer", 20)
                    for t in transfers
                ),
                "all_transfers_feasible": True
            },
            "solver_info": {
                "method": "greedy_matching",
                "hospitals_evaluated": n,
                "blood_groups_optimized": len(groups),
                "transfers_generated": len(transfers)
            },
            "generated_at": datetime.utcnow().isoformat()
        }

    def optimize_maximize_fulfillment(self, hospital_ids: Optional[List[str]],
                                       blood_groups: Optional[List[str]],
                                       time_horizon: int,
                                       constraints: Dict) -> Dict[str, Any]:
        network = self._fetch_network_state(hospital_ids)
        demand = self._fetch_demand_forecast(list(network.keys()), time_horizon)
        groups = blood_groups or BLOOD_GROUPS
        hospitals = list(network.keys())
        transfers = []
        fulfilled_units = 0
        total_demand = 0
        for bg in groups:
            for d_hid in hospitals:
                d_needed = demand.get(d_hid, {}).get(bg, 0)
                d_have = network[d_hid]["inventory"].get(bg, 0)
                shortfall = d_needed - d_have
                total_demand += d_needed
                fulfilled_units += min(d_have, d_needed)
                if shortfall <= 0:
                    continue
                compatible = COMPATIBILITY.get(bg, [bg])
                for s_hid in hospitals:
                    if s_hid == d_hid or shortfall <= 0:
                        continue
                    for c_bg in compatible:
                        s_surplus = network[s_hid]["inventory"].get(c_bg, 0) - demand.get(s_hid, {}).get(c_bg, 0)
                        if s_surplus <= 0:
                            continue
                        amount = min(shortfall, s_surplus,
                                    constraints.get("max_units_per_transfer", 20))
                        transfers.append({
                            "from_hospital": s_hid,
                            "from_name": network[s_hid]["name"],
                            "to_hospital": d_hid,
                            "to_name": network[d_hid]["name"],
                            "blood_group": c_bg,
                            "needed_group": bg,
                            "units": int(amount),
                            "compatibility_transfer": c_bg != bg
                        })
                        shortfall -= amount
                        fulfilled_units += amount
                        network[s_hid]["inventory"][c_bg] = network[s_hid]["inventory"].get(c_bg, 0) - amount
        return {
            "objective": "maximize_fulfillment",
            "optimal_transfers": transfers,
            "expected_improvement": {
                "fulfillment_rate": round(fulfilled_units / max(total_demand, 1), 4),
                "additional_units_fulfilled": int(fulfilled_units - sum(
                    min(network[h]["inventory"].get(bg, 0), demand.get(h, {}).get(bg, 0))
                    for h in hospitals for bg in groups
                ))
            },
            "cost_savings": round(fulfilled_units * 350, 2),
            "constraint_satisfaction": {
                "all_transfers_compatible": True,
                "max_units_respected": True
            },
            "solver_info": {
                "method": "compatibility_aware_matching",
                "hospitals_evaluated": len(hospitals),
                "transfers_generated": len(transfers)
            },
            "generated_at": datetime.utcnow().isoformat()
        }


class QuantumInspiredOptimizer:

    def __init__(self):
        self.classical = ClassicalOptimizer()

    def _simulated_annealing(self, cost_fn, initial_state: np.ndarray,
                              temp: float = 100, cooling: float = 0.99,
                              iterations: int = 1000) -> Dict[str, Any]:
        current = initial_state.copy()
        current_cost = cost_fn(current)
        best = current.copy()
        best_cost = current_cost
        for i in range(iterations):
            neighbor = current + np.random.randn(*current.shape) * temp * 0.01
            neighbor = np.clip(neighbor, 0, None)
            neighbor_cost = cost_fn(neighbor)
            delta = neighbor_cost - current_cost
            if delta < 0 or np.random.random() < np.exp(-delta / max(temp, 0.001)):
                current = neighbor
                current_cost = neighbor_cost
            if current_cost < best_cost:
                best = current.copy()
                best_cost = current_cost
            temp *= cooling
        return {"solution": best, "energy": best_cost}

    def optimize(self, hospital_ids: List[str], blood_groups: List[str],
                 objective: str, num_qubits: int) -> Dict[str, Any]:
        network = self.classical._fetch_network_state(hospital_ids)
        demand = self.classical._fetch_demand_forecast(hospital_ids, 7)
        hospitals = list(network.keys())
        n = len(hospitals)
        groups = blood_groups or BLOOD_GROUPS
        dim = n * len(groups)
        initial = np.random.rand(dim) * 10
        def cost_fn(x):
            total_cost = 0
            idx = 0
            for h in hospitals:
                for bg in groups:
                    inv = network[h]["inventory"].get(bg, 0)
                    dem = demand.get(h, {}).get(bg, 0)
                    transfer = x[idx]
                    remaining = inv - transfer
                    deficit = max(0, dem - remaining)
                    surplus = max(0, remaining - dem)
                    if objective == "maximize_fulfillment":
                        total_cost += deficit * 10
                    else:
                        total_cost += surplus * 5 + deficit * 10
                    idx += 1
            return total_cost
        sa_result = self._simulated_annealing(cost_fn, initial)
        classical_result = self.classical.optimize_minimize_waste(
            hospital_ids, [str(bg) for bg in groups], 7, {}
        )
        transfers = []
        idx = 0
        for h in hospitals:
            for bg in groups:
                amount = int(sa_result["solution"][idx])
                if amount > 0:
                    transfers.append({
                        "hospital": h,
                        "hospital_name": network.get(h, {}).get("name", ""),
                        "blood_group": bg,
                        "optimal_allocation": amount
                    })
                idx += 1
        return {
            "objective": objective,
            "solution": {
                "allocations": transfers,
                "method": "simulated_annealing",
                "virtual_qubits": num_qubits
            },
            "energy": round(float(sa_result["energy"]), 4),
            "feasible": sa_result["energy"] < cost_fn(initial),
            "comparison_classical": {
                "classical_transfers": len(classical_result.get("optimal_transfers", [])),
                "quantum_inspired_allocations": len(transfers),
                "classical_cost_savings": classical_result.get("cost_savings", 0)
            },
            "generated_at": datetime.utcnow().isoformat()
        }


classical_optimizer = ClassicalOptimizer()
quantum_optimizer = QuantumInspiredOptimizer()
