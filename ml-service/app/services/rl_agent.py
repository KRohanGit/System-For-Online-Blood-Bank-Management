import numpy as np
from typing import Dict, List, Any
from app.services.shared_utils import (
    fetch_hospital_data, build_hospital_inventory_map, BLOOD_GROUPS, timestamp
)
from app.services.rl_environment import BloodAllocationEnv
from app.services.rl_policy import SimplePolicy, QLearningPolicy


class RLAllocationAgent:
    def __init__(self):
        self.trained_policy = None
        self.training_history = []

    def train(self, episodes: int = 50, algorithm: str = "policy_gradient",
              max_hospitals: int = 10) -> Dict[str, Any]:
        hospitals = fetch_hospital_data()[:max_hospitals]
        inventory_map = build_hospital_inventory_map()
        hospital_ids = [str(h.get("_id", "")) for h in hospitals]

        if not hospital_ids:
            return {"error": "No hospitals found", "generated_at": timestamp()}

        env = BloodAllocationEnv(hospital_ids, inventory_map)

        if algorithm == "q_learning":
            policy = QLearningPolicy(state_buckets=10, action_dim=min(env.action_dim, 200))
        else:
            policy = SimplePolicy(env.state_dim, min(env.action_dim, 200))

        episode_rewards = []
        episode_metrics = []

        for ep in range(episodes):
            state = env.reset(inventory_map)
            states, actions, rewards = [], [], []
            done = False

            while not done:
                action = policy.select_action(state)
                next_state, reward, done = env.step(action)

                if algorithm == "q_learning":
                    policy.update_single(state, action, reward, next_state, done)
                else:
                    states.append(state)
                    actions.append(action)
                    rewards.append(reward)

                state = next_state

            if algorithm != "q_learning" and states:
                policy.update(states, actions, rewards)

            metrics = env.get_metrics()
            episode_rewards.append(metrics["episode_reward"])
            episode_metrics.append(metrics)

        self.trained_policy = policy
        self.training_history = episode_metrics

        return {
            "algorithm": algorithm,
            "episodes_trained": episodes,
            "hospital_count": len(hospital_ids),
            "final_reward": round(episode_rewards[-1], 2) if episode_rewards else 0,
            "avg_reward_last_10": round(np.mean(episode_rewards[-10:]), 2) if episode_rewards else 0,
            "reward_trend": [round(r, 2) for r in episode_rewards],
            "final_metrics": episode_metrics[-1] if episode_metrics else {},
            "policy_info": policy.get_policy_info(),
            "convergence": self._compute_convergence(episode_rewards),
            "generated_at": timestamp()
        }

    def simulate_allocation(self, strategy: str = "optimal",
                            duration_days: int = 30) -> Dict[str, Any]:
        hospitals = fetch_hospital_data()[:10]
        inventory_map = build_hospital_inventory_map()
        hospital_ids = [str(h.get("_id", "")) for h in hospitals]

        if not hospital_ids:
            return {"error": "No hospitals found", "generated_at": timestamp()}

        env = BloodAllocationEnv(hospital_ids, inventory_map)
        env.max_steps = duration_days
        state = env.reset(inventory_map)
        transfers = []
        daily_metrics = []
        done = False

        while not done:
            if strategy == "optimal" and self.trained_policy:
                action = self.trained_policy.select_action(state, explore=False)
            elif strategy == "greedy":
                action = self._greedy_action(env)
            else:
                action = np.random.randint(0, min(env.action_dim, 200))

            decoded = env.decode_action(action)
            next_state, reward, done = env.step(action)

            if decoded["from_hospital"] != decoded["to_hospital"]:
                transfers.append({
                    "day": env.step_count,
                    "from": decoded["from_hospital"],
                    "to": decoded["to_hospital"],
                    "blood_group": decoded["blood_group"],
                    "units": decoded["units"]
                })

            daily_metrics.append({
                "day": env.step_count,
                "reward": round(reward, 2),
                "total_stock": int(sum(sum(inv.values()) for inv in env.inventory.values()))
            })

            state = next_state

        final = env.get_metrics()
        return {
            "strategy": strategy,
            "duration_days": duration_days,
            "transfers": transfers[:50],
            "transfer_count": len(transfers),
            "daily_metrics": daily_metrics,
            "final_metrics": final,
            "generated_at": timestamp()
        }

    def get_policy(self) -> Dict[str, Any]:
        if not self.trained_policy:
            return {
                "trained": False,
                "message": "No policy trained yet. Call /rl-agent/train first.",
                "generated_at": timestamp()
            }
        return {
            "trained": True,
            "policy_info": self.trained_policy.get_policy_info(),
            "training_episodes": len(self.training_history),
            "last_metrics": self.training_history[-1] if self.training_history else {},
            "generated_at": timestamp()
        }

    def _greedy_action(self, env: BloodAllocationEnv) -> int:
        best_action = 0
        best_imbalance = float('inf')
        n_bg = len(BLOOD_GROUPS)
        for bg_idx in range(n_bg):
            bg = BLOOD_GROUPS[bg_idx]
            stocks = [(h_id, env.inventory[h_id].get(bg, 0)) for h_id in env.hospital_ids]
            stocks.sort(key=lambda x: x[1])
            if len(stocks) >= 2 and stocks[-1][1] > stocks[0][1] + 2:
                from_idx = env.hospital_ids.index(stocks[-1][0])
                to_idx = env.hospital_ids.index(stocks[0][0])
                imbalance = stocks[-1][1] - stocks[0][1]
                if imbalance < best_imbalance:
                    best_imbalance = imbalance
                    best_action = (from_idx * env.n_hospitals + to_idx) * n_bg + bg_idx
                    best_action = min(best_action, min(env.action_dim, 200) - 1)
        return best_action

    def _compute_convergence(self, rewards: List[float]) -> Dict[str, Any]:
        if len(rewards) < 10:
            return {"converged": False, "trend": "insufficient_data"}
        last_10 = rewards[-10:]
        first_10 = rewards[:10]
        improvement = np.mean(last_10) - np.mean(first_10)
        variance = np.std(last_10)
        converged = variance < abs(np.mean(last_10)) * 0.1 if np.mean(last_10) != 0 else False
        return {
            "converged": bool(converged),
            "improvement": round(improvement, 2),
            "final_variance": round(variance, 4),
            "trend": "improving" if improvement > 0 else "declining"
        }


rl_agent = RLAllocationAgent()
