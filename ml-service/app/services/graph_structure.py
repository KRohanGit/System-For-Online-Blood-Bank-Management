import numpy as np
from typing import Dict, List, Any, Optional


class HospitalGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = {}
        self.adjacency = {}

    def add_node(self, node_id: str, attributes: Dict[str, Any] = None):
        self.nodes[node_id] = attributes or {}
        if node_id not in self.adjacency:
            self.adjacency[node_id] = {}

    def add_edge(self, from_id: str, to_id: str, weight: float = 1.0,
                 attributes: Dict[str, Any] = None):
        edge_key = f"{from_id}->{to_id}"
        self.edges[edge_key] = {
            "from": from_id, "to": to_id,
            "weight": weight, **(attributes or {})
        }
        if from_id not in self.adjacency:
            self.adjacency[from_id] = {}
        if to_id not in self.adjacency:
            self.adjacency[to_id] = {}
        self.adjacency[from_id][to_id] = weight
        self.adjacency[to_id][from_id] = weight

    def get_neighbors(self, node_id: str) -> Dict[str, float]:
        return self.adjacency.get(node_id, {})

    def get_degree(self, node_id: str) -> int:
        return len(self.adjacency.get(node_id, {}))

    def get_all_nodes(self) -> List[str]:
        return list(self.nodes.keys())

    def get_node_count(self) -> int:
        return len(self.nodes)

    def get_edge_count(self) -> int:
        return len(self.edges)
