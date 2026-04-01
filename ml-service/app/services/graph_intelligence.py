import numpy as np
import hashlib
from typing import Dict, List, Any
from app.services.shared_utils import (
    fetch_hospital_data, build_hospital_inventory_map,
    fetch_emergency_data, haversine_distance,
    extract_hospital_coords, BLOOD_GROUPS, timestamp
)
from app.services.graph_structure import HospitalGraph
from app.services.graph_algorithms import (
    compute_degree_centrality, compute_closeness_centrality,
    compute_betweenness_centrality, compute_pagerank,
    detect_communities
)


class GraphIntelligenceEngine:
    def _deterministic_fallback_distance(self, node_a: str, node_b: str) -> float:
        ordered = "::".join(sorted([str(node_a), str(node_b)]))
        digest = hashlib.md5(ordered.encode("utf-8")).hexdigest()
        bucket = int(digest[:8], 16)
        # Deterministic distance between 10 and 80 km for nodes without coordinates.
        return 10.0 + (bucket % 7000) / 100.0

    def _build_graph(self, max_distance_km: float = 100.0) -> HospitalGraph:
        hospitals = fetch_hospital_data()
        inventory_map = build_hospital_inventory_map()
        graph = HospitalGraph()

        for h in hospitals:
            h_id = str(h.get("_id", ""))
            coords = extract_hospital_coords(h)
            stock = sum(inventory_map.get(h_id, {}).values())
            graph.add_node(h_id, {
                "name": h.get("name", "Unknown"),
                "city": h.get("city", ""),
                "coordinates": coords,
                "total_stock": stock,
                "inventory": inventory_map.get(h_id, {})
            })

        nodes = graph.get_all_nodes()
        for i in range(len(nodes)):
            for j in range(i + 1, len(nodes)):
                n1_attrs = graph.nodes[nodes[i]]
                n2_attrs = graph.nodes[nodes[j]]
                c1 = n1_attrs.get("coordinates")
                c2 = n2_attrs.get("coordinates")

                if c1 and c2:
                    dist = haversine_distance(c1["lat"], c1["lng"], c2["lat"], c2["lng"])
                else:
                    dist = self._deterministic_fallback_distance(nodes[i], nodes[j])

                if dist <= max_distance_km:
                    weight = 1.0 / max(dist, 0.1)
                    graph.add_edge(nodes[i], nodes[j], weight, {"distance_km": round(dist, 2)})

        return graph

    def get_centrality(self, metric: str = "all") -> Dict[str, Any]:
        graph = self._build_graph()
        result = {
            "node_count": graph.get_node_count(),
            "edge_count": graph.get_edge_count()
        }

        if metric in ("degree", "all"):
            result["degree_centrality"] = compute_degree_centrality(graph)
        if metric in ("closeness", "all"):
            result["closeness_centrality"] = compute_closeness_centrality(graph)
        if metric in ("betweenness", "all"):
            result["betweenness_centrality"] = compute_betweenness_centrality(graph)
        if metric in ("pagerank", "all"):
            result["pagerank"] = compute_pagerank(graph)

        if metric == "all":
            result["top_hospitals"] = self._rank_hospitals(graph, result)

        result["generated_at"] = timestamp()
        return result

    def get_bottlenecks(self, threshold: float = 0.3) -> Dict[str, Any]:
        graph = self._build_graph()
        betweenness = compute_betweenness_centrality(graph)
        degree = compute_degree_centrality(graph)

        bottlenecks = []
        for node_id in graph.get_all_nodes():
            btw = betweenness.get(node_id, 0)
            deg = degree.get(node_id, 0)
            attrs = graph.nodes.get(node_id, {})
            stock = attrs.get("total_stock", 0)
            is_bottleneck = btw > threshold or (deg > 0.5 and stock < 20)

            if is_bottleneck:
                bottlenecks.append({
                    "hospital_id": node_id,
                    "name": attrs.get("name", "Unknown"),
                    "betweenness": btw,
                    "degree": deg,
                    "total_stock": stock,
                    "risk_factors": self._assess_risk(btw, deg, stock)
                })

        bottlenecks.sort(key=lambda x: x["betweenness"], reverse=True)

        return {
            "bottleneck_count": len(bottlenecks),
            "bottlenecks": bottlenecks,
            "threshold_used": threshold,
            "recommendations": self._bottleneck_recommendations(bottlenecks),
            "generated_at": timestamp()
        }

    def get_stability_index(self) -> Dict[str, Any]:
        graph = self._build_graph()
        nodes = graph.get_all_nodes()
        n = len(nodes)

        if n == 0:
            return {"stability_index": 0, "generated_at": timestamp()}

        degree = compute_degree_centrality(graph)
        communities = detect_communities(graph)
        pagerank = compute_pagerank(graph)

        avg_degree = np.mean(list(degree.values())) if degree else 0
        max_edges = n * (n - 1) / 2 if n > 1 else 1
        density = graph.get_edge_count() / max_edges

        community_sizes = [len(c) for c in communities]
        fragmentation = len(communities) / max(n, 1)

        pr_values = list(pagerank.values())
        pr_entropy = 0.0
        if pr_values:
            pr_sum = sum(pr_values)
            if pr_sum > 0:
                pr_normalized = [p / pr_sum for p in pr_values]
                pr_entropy = -sum(p * np.log(p + 1e-10) for p in pr_normalized)
                max_entropy = np.log(max(n, 1))
                pr_entropy = pr_entropy / max(max_entropy, 1)

        stocks = [graph.nodes[nid].get("total_stock", 0) for nid in nodes]
        stock_cv = np.std(stocks) / max(np.mean(stocks), 1) if stocks else 1.0
        stock_balance = max(0, 1.0 - stock_cv)

        stability = round(
            0.25 * density +
            0.20 * avg_degree +
            0.20 * (1.0 - fragmentation) +
            0.15 * pr_entropy +
            0.20 * stock_balance, 4
        )
        stability = min(1.0, max(0.0, stability))

        if stability >= 0.7:
            rating = "stable"
        elif stability >= 0.4:
            rating = "moderate"
        else:
            rating = "unstable"

        return {
            "stability_index": stability,
            "rating": rating,
            "components": {
                "network_density": round(density, 4),
                "avg_connectivity": round(avg_degree, 4),
                "fragmentation": round(fragmentation, 4),
                "influence_distribution": round(pr_entropy, 4),
                "stock_balance": round(stock_balance, 4)
            },
            "network_stats": {
                "nodes": n,
                "edges": graph.get_edge_count(),
                "communities": len(communities),
                "community_sizes": community_sizes
            },
            "recommendations": self._stability_recommendations(stability, density, fragmentation),
            "generated_at": timestamp()
        }

    def _rank_hospitals(self, graph: HospitalGraph, metrics: Dict) -> List[Dict]:
        degree = metrics.get("degree_centrality", {})
        closeness = metrics.get("closeness_centrality", {})
        betweenness = metrics.get("betweenness_centrality", {})
        pr = metrics.get("pagerank", {})

        rankings = []
        for nid in graph.get_all_nodes():
            attrs = graph.nodes.get(nid, {})
            composite = (
                0.25 * degree.get(nid, 0) +
                0.25 * closeness.get(nid, 0) +
                0.25 * betweenness.get(nid, 0) +
                0.25 * (pr.get(nid, 0) * len(graph.get_all_nodes()))
            )
            rankings.append({
                "hospital_id": nid,
                "name": attrs.get("name", "Unknown"),
                "composite_score": round(composite, 4),
                "total_stock": attrs.get("total_stock", 0)
            })

        rankings.sort(key=lambda x: x["composite_score"], reverse=True)
        return rankings[:10]

    def _assess_risk(self, betweenness: float, degree: float, stock: int) -> List[str]:
        risks = []
        if betweenness > 0.5:
            risks.append("High network dependency - single point of failure")
        if degree > 0.6:
            risks.append("Hub overload risk - too many connections")
        if stock < 10:
            risks.append("Critically low inventory")
        elif stock < 30:
            risks.append("Low inventory buffer")
        if not risks:
            risks.append("Moderate network position")
        return risks

    def _bottleneck_recommendations(self, bottlenecks: List[Dict]) -> List[str]:
        recs = []
        if len(bottlenecks) == 0:
            recs.append("No critical bottlenecks detected in the network")
            return recs
        if len(bottlenecks) >= 3:
            recs.append("Multiple bottleneck hospitals detected - consider network restructuring")
        high_btw = [b for b in bottlenecks if b["betweenness"] > 0.5]
        if high_btw:
            names = [b["name"] for b in high_btw[:3]]
            recs.append(f"Critical bridge hospitals: {', '.join(names)} - establish backup routes")
        low_stock = [b for b in bottlenecks if b["total_stock"] < 20]
        if low_stock:
            recs.append("Bottleneck hospitals with low stock need priority replenishment")
        return recs

    def _stability_recommendations(self, stability: float, density: float,
                                    fragmentation: float) -> List[str]:
        recs = []
        if stability < 0.3:
            recs.append("Network stability critically low - immediate intervention needed")
        if density < 0.2:
            recs.append("Network is sparse - establish more inter-hospital transfer agreements")
        if fragmentation > 0.5:
            recs.append("High fragmentation - isolated hospital clusters need bridge connections")
        if stability >= 0.7:
            recs.append("Network operating in healthy state - maintain current connections")
        return recs


graph_engine = GraphIntelligenceEngine()
