function normalizeByMax(valuesByNode) {
  const values = Object.values(valuesByNode);
  const max = values.length ? Math.max(...values) : 0;
  if (max <= 0) return Object.fromEntries(Object.keys(valuesByNode).map((k) => [k, 0]));
  return Object.fromEntries(Object.entries(valuesByNode).map(([k, v]) => [k, Number((v / max).toFixed(6))]));
}

function buildDegreeCentrality(graphState) {
  const degree = {};
  const n = graphState.nodes.length;
  for (const node of graphState.nodes) {
    const neighbors = graphState.adjacency.get(node.hospitalId) || [];
    degree[node.hospitalId] = neighbors.reduce((sum, entry) => sum + Number(entry.weight || 0), 0);
  }

  if (n <= 1) {
    return Object.fromEntries(graphState.nodes.map((nNode) => [nNode.hospitalId, 0]));
  }

  const normalized = normalizeByMax(degree);
  return Object.fromEntries(
    Object.entries(normalized).map(([id, value]) => [id, Number((value * (Object.keys(degree).length - 1 > 0 ? 1 : 0)).toFixed(6))])
  );
}

function dijkstra(graphState, sourceId) {
  const ids = graphState.nodes.map((n) => n.hospitalId);
  const dist = Object.fromEntries(ids.map((id) => [id, Infinity]));
  const visited = new Set();
  dist[sourceId] = 0;

  while (visited.size < ids.length) {
    let current = null;
    let best = Infinity;

    for (const id of ids) {
      if (visited.has(id)) continue;
      if (dist[id] < best) {
        best = dist[id];
        current = id;
      }
    }

    if (!current || !Number.isFinite(best)) break;

    visited.add(current);
    const neighbors = graphState.adjacency.get(current) || [];
    for (const edge of neighbors) {
      const w = Math.max(Number(edge.weight || 0.00001), 0.00001);
      const cost = 1 / w;
      const nextDist = dist[current] + cost;
      if (nextDist < dist[edge.to]) dist[edge.to] = nextDist;
    }
  }

  return dist;
}

function buildClosenessCentrality(graphState) {
  const closeness = {};
  const n = graphState.nodes.length;

  for (const node of graphState.nodes) {
    const dist = dijkstra(graphState, node.hospitalId);
    const reachable = Object.values(dist).filter((d) => Number.isFinite(d) && d > 0);
    if (!reachable.length) {
      closeness[node.hospitalId] = 0;
      continue;
    }

    const sumDist = reachable.reduce((sum, d) => sum + d, 0);
    const reachFactor = reachable.length / Math.max(n - 1, 1);
    const value = (reachable.length / sumDist) * reachFactor;
    closeness[node.hospitalId] = value;
  }

  return normalizeByMax(closeness);
}

function buildBetweennessCentrality(graphState) {
  const nodeIds = graphState.nodes.map((n) => n.hospitalId);
  const score = Object.fromEntries(nodeIds.map((id) => [id, 0]));

  for (const source of nodeIds) {
    const stack = [];
    const predecessors = Object.fromEntries(nodeIds.map((id) => [id, []]));
    const sigma = Object.fromEntries(nodeIds.map((id) => [id, 0]));
    const distance = Object.fromEntries(nodeIds.map((id) => [id, Infinity]));

    sigma[source] = 1;
    distance[source] = 0;

    const queue = [source];
    while (queue.length) {
      queue.sort((a, b) => distance[a] - distance[b]);
      const v = queue.shift();
      stack.push(v);

      const neighbors = graphState.adjacency.get(v) || [];
      for (const next of neighbors) {
        const weight = Math.max(Number(next.weight || 0.00001), 0.00001);
        const edgeCost = 1 / weight;
        const candidate = distance[v] + edgeCost;

        if (candidate < distance[next.to] - 1e-9) {
          distance[next.to] = candidate;
          if (!queue.includes(next.to)) queue.push(next.to);
          sigma[next.to] = sigma[v];
          predecessors[next.to] = [v];
        } else if (Math.abs(candidate - distance[next.to]) <= 1e-9) {
          sigma[next.to] += sigma[v];
          predecessors[next.to].push(v);
          if (!queue.includes(next.to)) queue.push(next.to);
        }
      }
    }

    const delta = Object.fromEntries(nodeIds.map((id) => [id, 0]));
    while (stack.length) {
      const w = stack.pop();
      for (const v of predecessors[w]) {
        if (sigma[w] > 0) {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        }
      }
      if (w !== source) score[w] += delta[w];
    }
  }

  if (nodeIds.length > 2) {
    const norm = (nodeIds.length - 1) * (nodeIds.length - 2);
    for (const id of nodeIds) {
      score[id] = score[id] / norm;
    }
  }

  return normalizeByMax(score);
}

function connectedComponents(graphState) {
  const seen = new Set();
  const components = [];

  for (const node of graphState.nodes) {
    if (seen.has(node.hospitalId)) continue;
    const stack = [node.hospitalId];
    const component = [];

    while (stack.length) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      component.push(id);
      const neighbors = graphState.adjacency.get(id) || [];
      for (const n of neighbors) {
        if (!seen.has(n.to)) stack.push(n.to);
      }
    }

    components.push(component);
  }

  return components;
}

function computeNetworkStabilityScore(graphState, betweennessMap) {
  const n = graphState.nodes.length;
  const m = graphState.edges.length;

  if (n <= 1) {
    return {
      score: 100,
      components: {
        density: 1,
        largestComponentRatio: 1,
        pathEfficiency: 1,
        bottleneckPenalty: 0
      }
    };
  }

  const density = Math.min(1, (2 * m) / (n * (n - 1)));
  const components = connectedComponents(graphState);
  const largestComponent = Math.max(...components.map((c) => c.length), 1);
  const largestComponentRatio = largestComponent / n;

  const distances = [];
  for (const node of graphState.nodes) {
    const dist = dijkstra(graphState, node.hospitalId);
    for (const [targetId, value] of Object.entries(dist)) {
      if (targetId === node.hospitalId || !Number.isFinite(value) || value <= 0) continue;
      distances.push(value);
    }
  }

  const avgPath = distances.length ? distances.reduce((sum, d) => sum + d, 0) / distances.length : 0;
  const pathEfficiency = avgPath > 0 ? 1 / (1 + avgPath / 4) : 1;

  const maxBetweenness = Math.max(...Object.values(betweennessMap), 0);
  const bottleneckPenalty = Math.min(1, maxBetweenness);

  const raw =
    0.35 * density +
    0.30 * largestComponentRatio +
    0.25 * pathEfficiency +
    0.10 * (1 - bottleneckPenalty);

  const score = Math.max(0, Math.min(100, raw * 100));

  return {
    score: Number(score.toFixed(2)),
    components: {
      density: Number(density.toFixed(4)),
      largestComponentRatio: Number(largestComponentRatio.toFixed(4)),
      pathEfficiency: Number(pathEfficiency.toFixed(4)),
      bottleneckPenalty: Number(bottleneckPenalty.toFixed(4)),
      averagePathLength: Number(avgPath.toFixed(4))
    }
  };
}

function rankHospitals(graphState, degreeMap, closenessMap, betweennessMap) {
  return graphState.nodes
    .map((node) => ({
      hospitalId: node.hospitalId,
      hospitalName: node.hospitalName,
      degreeCentrality: Number((degreeMap[node.hospitalId] || 0).toFixed(6)),
      closenessCentrality: Number((closenessMap[node.hospitalId] || 0).toFixed(6)),
      betweennessCentrality: Number((betweennessMap[node.hospitalId] || 0).toFixed(6)),
      bridgeEdgeCount: (graphState.adjacency.get(node.hospitalId) || []).length,
      city: node.city,
      state: node.state
    }))
    .sort((a, b) => b.betweennessCentrality - a.betweennessCentrality || b.degreeCentrality - a.degreeCentrality);
}

module.exports = {
  buildDegreeCentrality,
  buildClosenessCentrality,
  buildBetweennessCentrality,
  computeNetworkStabilityScore,
  rankHospitals
};
