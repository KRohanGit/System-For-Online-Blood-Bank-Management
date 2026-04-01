import numpy as np
from typing import Dict, List, Any


class SimplePolicy:
    def __init__(self, state_dim: int, action_dim: int, learning_rate: float = 0.01):
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.lr = learning_rate
        self.weights = np.random.randn(state_dim, action_dim) * 0.01
        self.bias = np.zeros(action_dim)
        self.epsilon = 1.0
        self.epsilon_decay = 0.995
        self.epsilon_min = 0.05

    def select_action(self, state: np.ndarray, explore: bool = True) -> int:
        if explore and np.random.random() < self.epsilon:
            return np.random.randint(0, self.action_dim)
        logits = state @ self.weights + self.bias
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / (exp_logits.sum() + 1e-8)
        return int(np.argmax(probs))

    def update(self, states: List[np.ndarray], actions: List[int],
               rewards: List[float], gamma: float = 0.99):
        T = len(rewards)
        returns = np.zeros(T)
        G = 0
        for t in reversed(range(T)):
            G = rewards[t] + gamma * G
            returns[t] = G

        returns = (returns - returns.mean()) / (returns.std() + 1e-8)

        for t in range(T):
            state = states[t]
            action = actions[t]
            advantage = returns[t]
            logits = state @ self.weights + self.bias
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / (exp_logits.sum() + 1e-8)
            grad = -probs.copy()
            grad[action] += 1.0
            self.weights += self.lr * advantage * np.outer(state, grad)
            self.bias += self.lr * advantage * grad

        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

    def get_policy_info(self) -> Dict[str, Any]:
        return {
            "state_dim": self.state_dim,
            "action_dim": self.action_dim,
            "learning_rate": self.lr,
            "epsilon": round(self.epsilon, 4),
            "weight_norm": round(float(np.linalg.norm(self.weights)), 4)
        }


class QLearningPolicy:
    def __init__(self, state_buckets: int, action_dim: int, learning_rate: float = 0.1):
        self.state_buckets = state_buckets
        self.action_dim = action_dim
        self.lr = learning_rate
        self.gamma = 0.99
        self.epsilon = 1.0
        self.epsilon_decay = 0.995
        self.epsilon_min = 0.05
        self.q_table = {}

    def _discretize_state(self, state: np.ndarray) -> tuple:
        bins = np.clip(np.digitize(state, np.linspace(0, 100, self.state_buckets)), 0, self.state_buckets - 1)
        return tuple(bins[:5])

    def select_action(self, state: np.ndarray, explore: bool = True) -> int:
        s_key = self._discretize_state(state)
        if s_key not in self.q_table:
            self.q_table[s_key] = np.zeros(self.action_dim)
        if explore and np.random.random() < self.epsilon:
            return np.random.randint(0, self.action_dim)
        return int(np.argmax(self.q_table[s_key]))

    def update_single(self, state: np.ndarray, action: int, reward: float,
                      next_state: np.ndarray, done: bool):
        s_key = self._discretize_state(state)
        ns_key = self._discretize_state(next_state)
        if s_key not in self.q_table:
            self.q_table[s_key] = np.zeros(self.action_dim)
        if ns_key not in self.q_table:
            self.q_table[ns_key] = np.zeros(self.action_dim)
        target = reward + (0 if done else self.gamma * np.max(self.q_table[ns_key]))
        self.q_table[s_key][action] += self.lr * (target - self.q_table[s_key][action])
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

    def get_policy_info(self) -> Dict[str, Any]:
        return {
            "type": "q_learning",
            "state_buckets": self.state_buckets,
            "action_dim": self.action_dim,
            "learning_rate": self.lr,
            "epsilon": round(self.epsilon, 4),
            "q_table_size": len(self.q_table)
        }
