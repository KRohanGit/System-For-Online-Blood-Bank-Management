import numpy as np
from typing import Any, Dict, List, Tuple

from app.services.shared_utils import BLOOD_GROUPS, build_hospital_inventory_map, fetch_hospital_data, timestamp


class DigitalTwinEngine:
    def __init__(self):
        self._rng = np.random.default_rng()
        self._last_live_snapshot = None

    def simulate(self, scenario: str, params: Dict, duration_days: int, monte_carlo_runs: int) -> Dict[str, Any]:
        normalized_scenario = self._normalize_scenario(scenario)
        twin_state = self._build_initial_state(params)

        run_results = [
            self._run_single_path(normalized_scenario, twin_state, params, duration_days)
            for _ in range(monte_carlo_runs)
        ]

        timeline = self._aggregate_runs(run_results, duration_days)
        crisis = self._compute_crisis_detection(run_results, timeline, duration_days)
        resilience = self._compute_resilience(run_results, timeline, duration_days)
        vulnerable_groups = self._most_vulnerable_groups(run_results)
        network_optimization = self._network_optimization_hint(vulnerable_groups, crisis, twin_state)
        network_visualization = self._build_network_visualization(vulnerable_groups, crisis, network_optimization)
        decision = self._build_decision_engine_output(
            normalized_scenario,
            crisis,
            vulnerable_groups,
            resilience,
            twin_state,
            timeline,
            network_optimization,
        )
        strategy_comparison = self._build_strategy_comparison(crisis, twin_state)
        resilience_assessment = self._build_resilience_assessment(resilience, crisis)
        key_insights = self._build_key_insights(timeline, crisis, vulnerable_groups)

        return {
            "scenario": normalized_scenario,
            "digital_twin_state": twin_state,
            "duration_days": duration_days,
            "monte_carlo_runs": monte_carlo_runs,
            "timeline": timeline,
            "crisis_detection": crisis,
            "resilience_score": resilience,
            "most_critical_blood_groups": vulnerable_groups,
            "decision_support": decision,
            "confidence_score": decision["confidenceScore"],
            "recommended_actions": decision["recommendedActions"],
            "key_insights": key_insights,
            "strategy_comparison": strategy_comparison,
            "resilience_assessment": resilience_assessment,
            "network_visualization": network_visualization,
            "decision_output": {
                "riskStatus": decision["riskLevel"],
                "timeToShortage": decision["timeToShortage"],
                "stockoutProbability": decision["stockoutProbability"],
                "criticalBloodGroups": vulnerable_groups,
                "keyInsights": key_insights,
                "recommendedActions": decision["recommendedActions"],
                "strategyComparison": strategy_comparison,
                "resilienceScore": resilience_assessment,
                "aiExplanation": decision["aiExplanation"],
            },
            "network_optimization": network_optimization,
            "rl_policy_hint": self._rl_policy_hint(normalized_scenario, crisis, vulnerable_groups),
            "generated_at": timestamp(),
        }

    def compare_scenarios(self, scenarios: List[str], params: Dict, duration_days: int, monte_carlo_runs: int) -> Dict[str, Any]:
        scenario_results = {}
        for s in scenarios:
            r = self.simulate(s, params, duration_days, monte_carlo_runs)
            scenario_results[s] = {
                "riskLevel": r["decision_support"]["riskLevel"],
                "stockoutProbability": r["crisis_detection"]["stockout_probability"],
                "timeToShortageHours": r["crisis_detection"]["time_to_failure_hours"],
                "resilienceScore": r["resilience_score"]["score"],
                "wastageUnitsExpected": r["crisis_detection"]["expected_wastage_units"],
                "decisionSummary": r["decision_support"]["summary"],
            }

        ranked = sorted(
            scenario_results.items(),
            key=lambda x: (
                x[1]["stockoutProbability"],
                -x[1]["resilienceScore"],
                x[1]["wastageUnitsExpected"],
            ),
        )

        best_name, best_metrics = ranked[0]
        base_risk = best_metrics["stockoutProbability"]
        strategy_comparison = self._build_strategy_comparison(
            {
                "stockout_probability": base_risk,
                "time_to_failure_hours": best_metrics["timeToShortageHours"],
            },
            self._build_initial_state(params),
        )

        return {
            "comparison": scenario_results,
            "strategyComparison": strategy_comparison,
            "best_strategy": {
                "scenario": best_name,
                "why": "Lowest stockout probability with strongest resilience profile",
                "metrics": best_metrics,
            },
            "generated_at": timestamp(),
        }

    def get_status(self) -> Dict[str, Any]:
        state = self._build_initial_state({})
        totals = state["inventory"]
        self._last_live_snapshot = {
            "status": "active",
            "hospital_count": state["network"]["hospital_count"],
            "total_units": int(sum(totals.values())),
            "blood_group_totals": totals,
            "incomingSupplyRate": state["incomingSupplyRate"],
            "outgoingDemandRate": state["outgoingDemandRate"],
            "leadTimes": state["leadTimes"],
            "wastageRate": state["wastageRate"],
            "generated_at": timestamp(),
        }
        return self._last_live_snapshot

    def get_resilience_score(self) -> Dict[str, Any]:
        baseline = self.simulate("baseline", {}, 14, 150)
        return {
            "resilience_score": baseline["resilience_score"],
            "crisis_detection": baseline["crisis_detection"],
            "decision_support": baseline["decision_support"],
            "generated_at": timestamp(),
        }

    def recommend_best_strategy(self, params: Dict, duration_days: int, monte_carlo_runs: int) -> Dict[str, Any]:
        comparison = self.compare_scenarios(["baseline", "disaster", "donor_campaign"], params, duration_days, monte_carlo_runs)
        return {
            "message": "Best strategy to reduce risk right now",
            "recommendation": comparison["best_strategy"],
            "generated_at": timestamp(),
        }

    def _normalize_scenario(self, scenario: str) -> str:
        value = (scenario or "baseline").lower().strip()
        if value in ["campaign", "donor", "donor_campaign"]:
            return "donor_campaign"
        if value in ["disaster", "crisis"]:
            return "disaster"
        return "baseline"

    def _build_initial_state(self, params: Dict) -> Dict[str, Any]:
        hospitals = fetch_hospital_data()
        inventory_map = build_hospital_inventory_map()
        total_inventory = {bg: 0 for bg in BLOOD_GROUPS}

        for inv in inventory_map.values():
            for bg in BLOOD_GROUPS:
                total_inventory[bg] += int(inv.get(bg, 0))

        if sum(total_inventory.values()) == 0:
            total_inventory = {
                "A+": 140,
                "A-": 40,
                "B+": 120,
                "B-": 28,
                "AB+": 60,
                "AB-": 16,
                "O+": 170,
                "O-": 52,
            }

        demand_rates = {
            "A+": 15.0,
            "A-": 4.8,
            "B+": 12.0,
            "B-": 3.2,
            "AB+": 5.5,
            "AB-": 1.8,
            "O+": 17.5,
            "O-": 8.0,
        }
        supply_rates = {
            "A+": 13.5,
            "A-": 4.3,
            "B+": 10.5,
            "B-": 2.9,
            "AB+": 4.8,
            "AB-": 1.4,
            "O+": 15.6,
            "O-": 6.5,
        }

        demand_multiplier = float(params.get("demand_multiplier", 1.0))
        emergency_demand_surge_pct = float(params.get("emergency_demand_surge_pct", 0.0))
        demand_multiplier *= (1.0 + (emergency_demand_surge_pct / 100.0))

        donor_turnout_pct = float(params.get("donor_turnout_pct", 100.0))
        donor_turnout_factor = max(0.05, donor_turnout_pct / 100.0)
        supply_adjustment = float(params.get("supply_adjustment_pct", 0.0))
        supply_rate_factor = (1.0 + (supply_adjustment / 100.0)) * donor_turnout_factor

        adjusted_demand = {bg: max(0.2, r * demand_multiplier) for bg, r in demand_rates.items()}
        adjusted_supply = {bg: max(0.2, r * supply_rate_factor) for bg, r in supply_rates.items()}

        transport_delay_hours = float(params.get("transport_delay_hours", 0.0))
        decay_rate_pct = params.get("inventory_decay_rate_pct", None)
        wastage_rate = float(params.get("wastage_rate", 0.02))
        if decay_rate_pct is not None:
            wastage_rate = max(0.0, min(0.35, float(decay_rate_pct) / 100.0))

        return {
            "inventory": total_inventory,
            "incomingSupplyRate": adjusted_supply,
            "outgoingDemandRate": adjusted_demand,
            "leadTimes": {
                "internal_donor_hours": 10,
                "inter_hospital_transfer_hours": max(1, int(round(4 + transport_delay_hours))),
                "external_supplier_hours": 26,
            },
            "wastageRate": wastage_rate,
            "network": {
                "hospital_count": len(hospitals),
                "has_network_redistribution": len(hospitals) > 1,
            },
        }

    def _run_single_path(self, scenario: str, twin_state: Dict[str, Any], params: Dict, duration_days: int) -> Dict[str, Any]:
        inventory = {bg: float(v) for bg, v in twin_state["inventory"].items()}
        supply_rate = twin_state["incomingSupplyRate"]
        demand_rate = twin_state["outgoingDemandRate"]
        wastage_rate = twin_state["wastageRate"]

        disaster_peak_day = int(params.get("disaster_day", 3))
        disaster_severity = float(params.get("severity", 0.8))
        emergency_spike_prob = float(params.get("emergency_spike_prob", 0.10))
        emergency_spike_prob = min(0.75, emergency_spike_prob + (float(params.get("emergency_demand_surge_pct", 0.0)) / 500.0))
        transport_delay_hours = float(params.get("transport_delay_hours", 0.0))
        delay_penalty = min(0.45, max(0.0, transport_delay_hours / 48.0))

        timeline = []
        stockout_days = []
        per_group_stockout_counts = {bg: 0 for bg in BLOOD_GROUPS}
        wastage_total = 0.0
        excess_days = 0

        first_failure_day = None
        recovered_day = None
        in_failure = False

        for day in range(duration_days):
            group_snapshot = {}
            daily_unmet = 0.0

            for bg in BLOOD_GROUPS:
                demand_lambda = max(0.1, demand_rate[bg])
                supply_mean = max(0.1, supply_rate[bg])

                if scenario == "disaster" and day >= disaster_peak_day:
                    # Stress grows quickly after disaster trigger.
                    demand_lambda *= 1.8 + (0.35 * disaster_severity)
                    supply_mean *= 0.88
                elif scenario == "donor_campaign":
                    demand_lambda *= 0.95
                    supply_mean *= 1.20

                if self._rng.random() < emergency_spike_prob:
                    demand_lambda *= self._rng.uniform(1.15, 1.65)

                daily_demand = float(self._rng.poisson(demand_lambda))
                daily_supply = max(0.0, float(self._rng.normal(supply_mean, supply_mean * 0.18)))
                effective_supply = daily_supply * (1.0 - delay_penalty)
                expired = min(inventory[bg], inventory[bg] * (wastage_rate + delay_penalty * 0.08) * self._rng.uniform(0.85, 1.2))

                available_before_demand = max(0.0, inventory[bg] + effective_supply - expired)
                served = min(available_before_demand, daily_demand)
                unmet = max(0.0, daily_demand - served)
                ending = max(0.0, available_before_demand - served)

                if unmet > 0:
                    per_group_stockout_counts[bg] += 1

                inventory[bg] = ending
                wastage_total += expired
                daily_unmet += unmet

                group_snapshot[bg] = {
                    "stock": round(ending, 2),
                    "demand": round(daily_demand, 2),
                    "supply": round(effective_supply, 2),
                    "unmet": round(unmet, 2),
                    "expired": round(expired, 2),
                }

            total_units = float(sum(inventory.values()))
            total_unmet = float(sum(v["unmet"] for v in group_snapshot.values()))

            if total_unmet > 0:
                stockout_days.append(day)
                if first_failure_day is None:
                    first_failure_day = day
                in_failure = True
            elif in_failure and recovered_day is None:
                recovered_day = day
                in_failure = False

            if total_units > sum(twin_state["inventory"].values()) * 1.15:
                excess_days += 1

            timeline.append(
                {
                    "day": day,
                    "total_units": round(total_units, 2),
                    "unmet_units": round(total_unmet, 2),
                    "expired_units": round(sum(v["expired"] for v in group_snapshot.values()), 2),
                    "blood_group_totals": {bg: round(group_snapshot[bg]["stock"], 2) for bg in BLOOD_GROUPS},
                    "daily": group_snapshot,
                }
            )

        if first_failure_day is not None and recovered_day is None:
            recovered_day = duration_days

        recovery_days = None
        if first_failure_day is not None and recovered_day is not None:
            recovery_days = max(0, recovered_day - first_failure_day)

        return {
            "timeline": timeline,
            "stockout_days": stockout_days,
            "first_failure_day": first_failure_day,
            "recovery_days": recovery_days,
            "wastage_total": round(wastage_total, 2),
            "excess_days": excess_days,
            "group_stockout_counts": per_group_stockout_counts,
        }

    def _aggregate_runs(self, runs: List[Dict[str, Any]], duration_days: int) -> List[Dict[str, Any]]:
        aggregated = []
        for day in range(duration_days):
            points = [r["timeline"][day] for r in runs]
            total_units = np.array([p["total_units"] for p in points], dtype=float)
            unmet = np.array([p["unmet_units"] for p in points], dtype=float)

            bg_mean = {}
            for bg in BLOOD_GROUPS:
                bg_values = np.array([p["blood_group_totals"].get(bg, 0) for p in points], dtype=float)
                bg_mean[bg] = round(float(np.mean(bg_values)), 2)

            aggregated.append(
                {
                    "day": day,
                    "total_units_mean": round(float(np.mean(total_units)), 2),
                    "total_units_p05": round(float(np.percentile(total_units, 5)), 2),
                    "total_units_p95": round(float(np.percentile(total_units, 95)), 2),
                    "unmet_units_mean": round(float(np.mean(unmet)), 2),
                    "stockout_probability": round(float(np.mean(unmet > 0)), 4),
                    "blood_group_totals": bg_mean,
                }
            )
        return aggregated

    def _compute_crisis_detection(self, runs: List[Dict[str, Any]], timeline: List[Dict[str, Any]], duration_days: int) -> Dict[str, Any]:
        first_failures = [r["first_failure_day"] for r in runs if r["first_failure_day"] is not None]
        has_stockout = [1 if r["stockout_days"] else 0 for r in runs]

        stockout_probability = float(np.mean(has_stockout)) if has_stockout else 0.0
        avg_wastage = float(np.mean([r["wastage_total"] for r in runs])) if runs else 0.0

        if first_failures:
            median_first_failure_day = float(np.median(first_failures))
            time_to_failure_hours = int(max(1, round(median_first_failure_day * 24)))
        else:
            time_to_failure_hours = duration_days * 24

        return {
            "stockout_probability": round(stockout_probability, 4),
            "time_to_failure_hours": time_to_failure_hours,
            "time_to_failure_days": round(time_to_failure_hours / 24.0, 1),
            "expected_wastage_units": round(avg_wastage, 2),
            "failure_points": [p for p in timeline if p["stockout_probability"] > 0.35],
        }

    def _most_vulnerable_groups(self, runs: List[Dict[str, Any]]) -> List[str]:
        group_risk = {bg: 0.0 for bg in BLOOD_GROUPS}
        for bg in BLOOD_GROUPS:
            group_risk[bg] = float(
                np.mean([r["group_stockout_counts"].get(bg, 0) for r in runs])
            )

        ranked = sorted(group_risk.items(), key=lambda x: x[1], reverse=True)
        return [name for name, _ in ranked[:3]]

    def _compute_resilience(self, runs: List[Dict[str, Any]], timeline: List[Dict[str, Any]], duration_days: int) -> Dict[str, Any]:
        avg_stock = float(np.mean([p["total_units_mean"] for p in timeline])) if timeline else 0.0
        avg_stock_p05 = float(np.mean([p["total_units_p05"] for p in timeline])) if timeline else 0.0
        avg_unmet = float(np.mean([p["unmet_units_mean"] for p in timeline])) if timeline else 0.0
        avg_recovery = float(
            np.mean([r["recovery_days"] for r in runs if r["recovery_days"] is not None])
        ) if any(r["recovery_days"] is not None for r in runs) else duration_days

        stock_availability = max(0.0, min(1.0, avg_stock_p05 / max(avg_stock, 1.0)))
        recovery_component = max(0.0, min(1.0, 1.0 - (avg_recovery / max(duration_days, 1))))
        redundancy_component = max(
            0.0,
            min(1.0, 1.0 - (np.mean([r["wastage_total"] for r in runs]) / max(avg_stock * duration_days * 0.08, 1))),
        )
        demand_coverage = max(0.0, min(1.0, 1.0 - (avg_unmet / max(avg_stock * 0.2, 1.0))))

        total_units_series = np.array([p["total_units_mean"] for p in timeline], dtype=float) if timeline else np.array([0.0])
        volatility = float(np.std(total_units_series) / max(np.mean(total_units_series), 1.0))
        volatility_component = max(0.0, min(1.0, 1.0 - min(1.0, volatility * 3.5)))

        score = (
            0.35 * stock_availability
            + 0.25 * recovery_component
            + 0.20 * redundancy_component
            + 0.20 * volatility_component
        ) * 100.0

        if score >= 75:
            label = "Stable"
        elif score >= 50:
            label = "Vulnerable"
        else:
            label = "Critical"

        return {
            "score": round(float(score), 1),
            "label": label,
            "components": {
                "stock_availability": round(stock_availability * 100, 1),
                "recovery_speed": round(recovery_component * 100, 1),
                "redundancy": round(redundancy_component * 100, 1),
                "demand_volatility_control": round(volatility_component * 100, 1),
                "demand_coverage": round(demand_coverage * 100, 1),
            },
        }

    def _build_decision_engine_output(
        self,
        scenario: str,
        crisis: Dict[str, Any],
        vulnerable_groups: List[str],
        resilience: Dict[str, Any],
        twin_state: Dict[str, Any],
        timeline: List[Dict[str, Any]],
        network_hint: Dict[str, Any],
    ) -> Dict[str, Any]:
        stockout_prob = crisis["stockout_probability"]
        ttf_hours = crisis["time_to_failure_hours"]

        if stockout_prob >= 0.75 or ttf_hours <= 18:
            risk_level = "CRITICAL"
        elif stockout_prob >= 0.45 or ttf_hours <= 36:
            risk_level = "HIGH"
        elif stockout_prob >= 0.25:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        actions, ai_explanations = self._build_ranked_actions(
            risk_level,
            vulnerable_groups,
            crisis,
            twin_state,
            scenario,
            timeline,
            network_hint,
        )

        confidence = min(0.98, max(0.55, 0.62 + (stockout_prob * 0.35) + (resilience["score"] / 1000.0)))

        return {
            "scenario": scenario.upper(),
            "riskLevel": risk_level,
            "stockoutProbability": round(stockout_prob, 4),
            "timeToShortage": f"{ttf_hours} hours",
            "mostCriticalBloodGroups": vulnerable_groups,
            "recommendedActions": actions,
            "aiExplanation": ai_explanations,
            "confidenceScore": round(confidence, 4),
            "summary": (
                f"{risk_level} risk with {round(stockout_prob * 100)}% stockout probability; "
                f"expected shortage in ~{ttf_hours}h, prioritize {', '.join(vulnerable_groups[:2])}."
            ),
        }

    def _build_ranked_actions(
        self,
        risk_level: str,
        vulnerable_groups: List[str],
        crisis: Dict[str, Any],
        twin_state: Dict[str, Any],
        scenario: str,
        timeline: List[Dict[str, Any]],
        network_hint: Dict[str, Any],
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        urgent_group = vulnerable_groups[0] if vulnerable_groups else "O-"
        transfers = network_hint.get("transfers", [])
        stockout_prob = float(crisis.get("stockout_probability", 0.0))
        urgency_base = 95 if risk_level == "CRITICAL" else 82 if risk_level == "HIGH" else 64

        trend_days = min(7, max(3, len(timeline)))
        recent = timeline[-trend_days:] if timeline else []
        primary_trend_drop = 0.0
        if recent:
            start_val = max(1.0, float(recent[0]["blood_group_totals"].get(urgent_group, 1.0)))
            end_val = float(recent[-1]["blood_group_totals"].get(urgent_group, start_val))
            primary_trend_drop = max(0.0, ((start_val - end_val) / start_val) * 100.0)

        scored = []
        for transfer in transfers[:3]:
            demand_gap = float(transfer.get("demand_gap", 0.0))
            distance_factor = float(transfer.get("distance_factor", 0.0))
            stock_availability = float(transfer.get("stock_availability", 0.0))
            score = urgency_base + distance_factor + stock_availability + demand_gap

            impact = min(85.0, max(18.0, (stockout_prob * 100.0 * 0.42) + (demand_gap * 0.28)))
            eta_hours = float(transfer.get("eta_hours", 4.0))
            confidence = min(0.97, max(0.61, 0.58 + score / 400.0))

            scored.append(
                {
                    "priority": 0,
                    "action": (
                        f"Transfer {int(transfer.get('recommended_units', 0))} units of {transfer.get('blood_group', urgent_group)} "
                        f"from {transfer.get('from_hospital')} to {transfer.get('to_hospital')}"
                    ),
                    "sourceHospital": transfer.get("from_hospital"),
                    "destinationHospital": transfer.get("to_hospital"),
                    "unitsToTransfer": int(transfer.get("recommended_units", 0)),
                    "estimatedDeliveryTime": f"{eta_hours:.1f} hrs",
                    "expectedImpactPct": round(impact, 1),
                    "urgency": transfer.get("priority", "HIGH").upper(),
                    "score": round(score, 1),
                    "why": (
                        f"Destination has a high {transfer.get('blood_group', urgent_group)} demand gap while source has available stock"
                    ),
                    "basedOnPastDays": trend_days,
                    "confidence": round(confidence, 3),
                    "modelReasoning": (
                        f"{transfer.get('blood_group', urgent_group)} trend dropped {int(round(primary_trend_drop))}% in last {trend_days} days"
                    ),
                }
            )

        campaign_score = urgency_base + 45 + 36 + min(40.0, primary_trend_drop)
        scored.append(
            {
                "priority": 0,
                "action": "Run AI-targeted donor campaign for high-risk blood groups",
                "sourceHospital": "regional_donor_pool",
                "destinationHospital": "network_wide",
                "unitsToTransfer": max(15, int(sum(twin_state.get("inventory", {}).values()) * 0.06)),
                "estimatedDeliveryTime": "6.0 hrs",
                "expectedImpactPct": round(min(70.0, 22.0 + stockout_prob * 100.0 * 0.35), 1),
                "urgency": "HIGH",
                "score": round(campaign_score, 1),
                "why": "Donor inflow can offset projected depletion when transfer buffers are limited",
                "basedOnPastDays": trend_days,
                "confidence": round(min(0.94, max(0.6, 0.62 + campaign_score / 430.0)), 3),
                "modelReasoning": (
                    f"{urgent_group} demand trend is elevated and network-wide donor response improves replenishment speed"
                ),
            }
        )

        if scenario == "disaster":
            scored.append(
                {
                    "priority": 0,
                    "action": "Activate combined transfer + demand triage protocol",
                    "sourceHospital": "command_center",
                    "destinationHospital": "all_critical_nodes",
                    "unitsToTransfer": 0,
                    "estimatedDeliveryTime": "2.0 hrs",
                    "expectedImpactPct": 48.0,
                    "urgency": "IMMEDIATE",
                    "score": round(urgency_base + 120, 1),
                    "why": "High uncertainty and surge conditions need both supply and demand-side controls",
                    "basedOnPastDays": trend_days,
                    "confidence": 0.88,
                    "modelReasoning": "Crisis pattern resembles previous high-volatility windows with compounding demand spikes",
                }
            )

        scored = sorted(scored, key=lambda a: float(a.get("score", 0.0)), reverse=True)
        for idx, action in enumerate(scored, start=1):
            action["priority"] = idx

        explanations = [
            {
                "action": item["action"],
                "why": item["why"],
                "basedOnPastDays": item["basedOnPastDays"],
                "confidence": item["confidence"],
                "modelReasoning": item["modelReasoning"],
            }
            for item in scored
        ]

        return scored, explanations

    def _build_strategy_comparison(self, crisis: Dict[str, Any], twin_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        risk_pct = max(0.0, min(99.0, float(crisis.get("stockout_probability", 0.0)) * 100.0))
        ttf = int(max(1, crisis.get("time_to_failure_hours", 24)))
        has_network = bool(twin_state.get("network", {}).get("has_network_redistribution", False))

        transfer_gain = 18 if has_network else 12
        transfer_reduction = 72 if has_network else 52

        table = [
            {
                "strategy": "Do Nothing",
                "riskReduction": 0,
                "timeGained": "0 hrs",
                "costEstimate": 0,
                "feasibilityScore": 100,
            },
            {
                "strategy": "Donor Campaign",
                "riskReduction": int(min(65, max(35, round(risk_pct * 0.72)))),
                "timeGained": f"{int(max(4, round(ttf * 0.45)))} hrs",
                "costEstimate": 42000,
                "feasibilityScore": 78,
            },
            {
                "strategy": "Stock Transfer",
                "riskReduction": int(min(78, max(45, transfer_reduction))),
                "timeGained": f"{transfer_gain} hrs",
                "costEstimate": 31000,
                "feasibilityScore": 85 if has_network else 62,
            },
            {
                "strategy": "Combined Strategy",
                "riskReduction": int(min(88, max(55, round((transfer_reduction + risk_pct * 0.72) * 0.62)))),
                "timeGained": f"{int(max(10, round(ttf * 0.8)))} hrs",
                "costEstimate": 56000,
                "feasibilityScore": 73 if has_network else 58,
            },
        ]

        best_idx = max(range(len(table)), key=lambda idx: (table[idx]["riskReduction"], int(str(table[idx]["timeGained"]).split()[0])))
        table[best_idx]["recommended"] = True
        return table

    def _build_resilience_assessment(self, resilience: Dict[str, Any], crisis: Dict[str, Any]) -> Dict[str, Any]:
        score = int(round(float(resilience.get("score", 0.0))))
        components = resilience.get("components", {})

        reasons = []
        if components.get("stock_availability", 100) < 60:
            reasons.append("Low buffer stock")
        if components.get("demand_coverage", 100) < 65:
            reasons.append("High demand variability")
        if components.get("redundancy", 100) < 70:
            reasons.append("Insufficient backup supply redundancy")
        if components.get("recovery_speed", 100) < 65:
            reasons.append("Recovery from disruption is slow")
        if not reasons:
            reasons.append("Current reserve is stable but vulnerable to sudden spikes")

        suggestions = []
        if "Low buffer stock" in reasons:
            suggestions.append("Maintain minimum 2-day reserve for O- and O+")
        if "High demand variability" in reasons:
            suggestions.append("Increase donor engagement frequency and pre-book drives")
        if "Insufficient backup supply redundancy" in reasons:
            suggestions.append("Increase cross-hospital standby transfer agreements")
        if "Recovery from disruption is slow" in reasons:
            suggestions.append("Pre-authorize emergency transfers with top partner hospitals")
        if not suggestions:
            suggestions.append("Run weekly stress drills to preserve resilience")

        if score >= 75:
            level = "STABLE"
        elif score >= 50:
            level = "VULNERABLE"
        else:
            level = "CRITICAL"

        if crisis.get("stockout_probability", 0.0) > 0.75 and level == "STABLE":
            level = "VULNERABLE"

        return {
            "score": score,
            "level": level,
            "reason": reasons,
            "improvementSuggestions": suggestions,
        }

    def _build_key_insights(
        self,
        timeline: List[Dict[str, Any]],
        crisis: Dict[str, Any],
        vulnerable_groups: List[str],
    ) -> List[str]:
        if not timeline:
            return ["Simulation data unavailable for insight generation"]

        early_window = timeline[: max(1, len(timeline) // 3)]
        late_window = timeline[-max(1, len(timeline) // 3):]

        early_units = float(np.mean([p.get("total_units_mean", 0) for p in early_window]))
        late_units = float(np.mean([p.get("total_units_mean", 0) for p in late_window]))
        demand_pressure = float(np.mean([p.get("unmet_units_mean", 0) for p in late_window]))

        drop_pct = 0.0
        if early_units > 0:
            drop_pct = max(0.0, ((early_units - late_units) / early_units) * 100.0)

        ttf = crisis.get("time_to_failure_hours", 24)
        risk_pct = int(round(crisis.get("stockout_probability", 0.0) * 100))

        primary_group = vulnerable_groups[0] if vulnerable_groups else "O-"
        secondary_group = vulnerable_groups[1] if len(vulnerable_groups) > 1 else "B+"

        return [
            f"{primary_group} and {secondary_group} inventory is depleting fastest across the network",
            f"Stockout probability is {risk_pct}% with expected shortage window around {ttf} hours",
            f"Average inventory has dropped by {int(round(drop_pct))}% across the simulation horizon",
            (
                "Current supply cannot sustain projected demand for the next 24 hours"
                if demand_pressure > 0.2
                else "Supply-demand balance is still viable but requires close monitoring"
            ),
        ]

    def _network_optimization_hint(self, vulnerable_groups: List[str], crisis: Dict[str, Any], twin_state: Dict[str, Any]) -> Dict[str, Any]:
        inventory_map = build_hospital_inventory_map()
        transfers = []
        if not inventory_map:
            return {"transfers": transfers, "note": "No network inventory found"}

        hospital_ids = list(inventory_map.keys())
        if len(hospital_ids) < 2:
            return {"transfers": transfers, "note": "Single hospital network"}

        for bg in vulnerable_groups[:2]:
            ranked = sorted(hospital_ids, key=lambda h: inventory_map[h].get(bg, 0), reverse=True)
            source = ranked[0]
            dest = ranked[-1]
            source_stock = float(inventory_map[source].get(bg, 0))
            dest_stock = float(inventory_map[dest].get(bg, 0))
            gap_units = max(0.0, source_stock - dest_stock)
            move_units = max(0, int(gap_units * 0.25))
            if move_units > 0:
                distance_km = 8 + (abs(hash(f"{source}-{dest}")) % 45)
                eta_hours = round(distance_km / 30.0 + twin_state.get("leadTimes", {}).get("inter_hospital_transfer_hours", 4) * 0.6, 1)
                distance_factor = max(0.0, 100.0 - distance_km)
                stock_availability = min(100.0, source_stock)
                demand_gap = min(100.0, max(0.0, gap_units))
                transfers.append(
                    {
                        "blood_group": bg,
                        "from_hospital": source,
                        "to_hospital": dest,
                        "recommended_units": move_units,
                        "priority": "urgent",
                        "eta_hours": eta_hours,
                        "distance_km": distance_km,
                        "distance_factor": round(distance_factor, 1),
                        "stock_availability": round(stock_availability, 1),
                        "demand_gap": round(demand_gap, 1),
                    }
                )

        return {
            "transfers": transfers,
            "stockout_probability": crisis.get("stockout_probability", 0.0),
            "generated_at": timestamp(),
        }

    def _build_network_visualization(
        self,
        vulnerable_groups: List[str],
        crisis: Dict[str, Any],
        network_hint: Dict[str, Any],
    ) -> Dict[str, Any]:
        inventory_map = build_hospital_inventory_map()
        hospital_ids = list(inventory_map.keys())
        if not hospital_ids:
            return {"nodes": [], "edges": []}

        nodes = []
        for hid in hospital_ids:
            total = int(sum(int(v) for v in inventory_map.get(hid, {}).values()))
            if total <= 70:
                status = "shortage"
            elif total <= 150:
                status = "risk"
            else:
                status = "stable"

            critical = any(inventory_map.get(hid, {}).get(bg, 0) <= 8 for bg in vulnerable_groups[:2])
            nodes.append(
                {
                    "id": hid,
                    "label": hid,
                    "totalUnits": total,
                    "status": status,
                    "critical": critical,
                }
            )

        edges = [
            {
                "source": t.get("from_hospital"),
                "target": t.get("to_hospital"),
                "bloodGroup": t.get("blood_group"),
                "units": t.get("recommended_units", 0),
            }
            for t in network_hint.get("transfers", [])
        ]

        return {
            "nodes": nodes,
            "edges": edges,
            "criticalNodeIds": [n["id"] for n in nodes if n.get("critical")],
            "legend": {
                "shortage": "red",
                "risk": "yellow",
                "stable": "green",
            },
            "risk_level": "high" if crisis.get("stockout_probability", 0) > 0.45 else "moderate",
        }

    def _rl_policy_hint(self, scenario: str, crisis: Dict[str, Any], vulnerable_groups: List[str]) -> Dict[str, Any]:
        # Lightweight policy recommendation that can be replaced by trained RL policy service.
        state_key = f"{scenario}:{int(crisis['stockout_probability'] * 10)}"
        if crisis["stockout_probability"] > 0.6:
            action = "aggressive_transfer_and_campaign"
            expected_reward = 0.82
        elif crisis["stockout_probability"] > 0.3:
            action = "moderate_transfer_plus_conservation"
            expected_reward = 0.64
        else:
            action = "baseline_monitoring"
            expected_reward = 0.52

        return {
            "state": state_key,
            "recommended_policy_action": action,
            "target_groups": vulnerable_groups[:2],
            "expected_reward": expected_reward,
        }


digital_twin_engine = DigitalTwinEngine()
