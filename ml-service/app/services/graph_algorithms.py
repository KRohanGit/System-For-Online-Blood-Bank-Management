import numpy as np
from typing import Dict, List, Any
from app.services.graph_structure import HospitalGraph


def compute_degree_centrality(graph: HospitalGraph) -> Dict[str, float]:
    nodes = graph.get_all_nodes()
    n = len(nodes)
    if n <= 1:
        return {nid: 0.0 for nid in nodes}
    result = {}
    for nid in nodes:
        result[nid] = round(graph.get_degree(nid) / (n - 1), 4)
    return result


def compute_closeness_centrality(graph: HospitalGraph) -> Dict[str, float]:
    nodes = graph.get_all_nodes()
    n = len(nodes)
    if n <= 1:
        return {nid: 0.0 for nid in nodes}

    result = {}
    for source in nodes:
        distances = _bfs_distances(graph, source)
        reachable = {k: v for k, v in distances.items() if v > 0}
        if reachable:
            avg_dist = sum(reachable.values()) / len(reachable)
            result[source] = round(1.0 / avg_dist if avg_dist > 0 else 0.0, 4)
        else:
            result[source] = 0.0
    return result


def compute_betweenness_centrality(graph: HospitalGraph) -> Dict[str, float]:
    nodes = graph.get_all_nodes()
    n = len(nodes)
    betweenness = {nid: 0.0 for nid in nodes}

    if n <= 2:
        return betweenness

    for source in nodes:
        stack = []
        predecessors = {nid: [] for nid in nodes}
        sigma = {nid: 0.0 for nid in nodes}
        sigma[source] = 1.0
        dist = {nid: -1 for nid in nodes}
        dist[source] = 0
        queue = [source]

        while queue:
            v = queue.pop(0)
            stack.append(v)
            for w in graph.get_neighbors(v):
                if dist[w] < 0:
                    queue.append(w)
                    dist[w] = dist[v] + 1
                if dist[w] == dist[v] + 1:
                    sigma[w] += sigma[v]
                    predecessors[w].append(v)

        delta = {nid: 0.0 for nid in nodes}
        while stack:
            w = stack.pop()
            for v in predecessors[w]:
                delta[v] += (sigma[v] / max(sigma[w], 1e-8)) * (1 + delta[w])
            if w != source:
                betweenness[w] += delta[w]

    normalizer = max(1, (n - 1) * (n - 2))
    return {nid: round(v / normalizer, 4) for nid, v in betweenness.items()}


def compute_pagerank(graph: HospitalGraph, damping: float = 0.85,
                     max_iter: int = 100, tol: float = 1e-6) -> Dict[str, float]:
    nodes = graph.get_all_nodes()
    n = len(nodes)
    if n == 0:
        return {}

    rank = {nid: 1.0 / n for nid in nodes}

    for _ in range(max_iter):
        new_rank = {}
        for nid in nodes:
            incoming_sum = 0.0
            for neighbor, weight in graph.get_neighbors(nid).items():
                out_degree = graph.get_degree(neighbor)
                if out_degree > 0:
                    incoming_sum += rank[neighbor] / out_degree
            new_rank[nid] = (1 - damping) / n + damping * incoming_sum

        diff = sum(abs(new_rank[nid] - rank[nid]) for nid in nodes)
        rank = new_rank
        if diff < tol:
            break

    return {nid: round(v, 6) for nid, v in rank.items()}


def _bfs_distances(graph: HospitalGraph, source: str) -> Dict[str, int]:
    distances = {source: 0}
    queue = [source]
    while queue:
        current = queue.pop(0)
        for neighbor in graph.get_neighbors(current):
            if neighbor not in distances:
                distances[neighbor] = distances[current] + 1
                queue.append(neighbor)
    return distances


def detect_communities(graph: HospitalGraph) -> List[List[str]]:
    nodes = graph.get_all_nodes()
    visited = set()
    communities = []

    for node in nodes:
        if node not in visited:
            community = []
            queue = [node]
            while queue:
                current = queue.pop(0)
                if current not in visited:
                    visited.add(current)
                    community.append(current)
                    for neighbor in graph.get_neighbors(current):
                        if neighbor not in visited:
                            queue.append(neighbor)
            communities.append(community)

    return communities
