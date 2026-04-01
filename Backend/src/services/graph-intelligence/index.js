const GraphNetworkSnapshot = require('../../models/GraphNetworkSnapshot');
const eventBus = require('../realtime/eventBus');
const { broadcast } = require('../realtime/socketService');
const { buildGraphState } = require('./graphBuilder');
const {
  buildDegreeCentrality,
  buildClosenessCentrality,
  buildBetweennessCentrality,
  computeNetworkStabilityScore,
  rankHospitals
} = require('./metrics');

class GraphIntelligenceService {
  constructor() {
    this.latest = null;
    this.isComputing = false;
    this.isInitialized = false;
  }

  async compute(trigger = 'manual') {
    if (this.isComputing && this.latest) {
      return this.latest;
    }

    this.isComputing = true;
    const startedAt = Date.now();

    try {
      const graphState = await buildGraphState();
      const degree = buildDegreeCentrality(graphState);
      const closeness = buildClosenessCentrality(graphState);
      const betweenness = buildBetweennessCentrality(graphState);
      const ranking = rankHospitals(graphState, degree, closeness, betweenness);
      const stability = computeNetworkStabilityScore(graphState, betweenness);
      const computeMs = Date.now() - startedAt;

      const result = {
        trigger,
        generatedAt: new Date().toISOString(),
        computeMs,
        graph: {
          nodeCount: graphState.nodes.length,
          edgeCount: graphState.edges.length,
          maxDistanceKm: graphState.maxDistanceKm,
          lookbackDays: graphState.lookbackDays
        },
        centrality: {
          degree,
          closeness,
          betweenness,
          ranking
        },
        bottlenecks: ranking.slice(0, 8).map((item) => ({
          ...item,
          riskLevel:
            item.betweennessCentrality >= 0.75
              ? 'critical'
              : item.betweennessCentrality >= 0.45
              ? 'high'
              : 'moderate'
        })),
        stability: {
          score: stability.score,
          ...stability.components
        },
        nodes: graphState.nodes,
        edges: graphState.edges
      };

      this.latest = result;

      await GraphNetworkSnapshot.create({
        trigger,
        computedAt: new Date(),
        stats: {
          nodeCount: result.graph.nodeCount,
          edgeCount: result.graph.edgeCount,
          avgEdgeWeight: Number(
            (
              (graphState.edges.reduce((sum, e) => sum + Number(e.weight || 0), 0) / Math.max(graphState.edges.length, 1)) ||
              0
            ).toFixed(6)
          ),
          density: result.stability.density,
          largestComponentRatio: result.stability.largestComponentRatio,
          averagePathLength: result.stability.averagePathLength,
          stabilityScore: result.stability.score
        },
        topCentralHospitals: ranking.slice(0, 10),
        topBottlenecks: result.bottlenecks.slice(0, 10)
      });

      return result;
    } finally {
      this.isComputing = false;
    }
  }

  async getCentrality(force = false) {
    if (force || !this.latest) {
      await this.compute(force ? 'force:centrality' : 'bootstrap');
    }
    return {
      generatedAt: this.latest.generatedAt,
      computeMs: this.latest.computeMs,
      graph: this.latest.graph,
      ranking: this.latest.centrality.ranking,
      degree: this.latest.centrality.degree,
      closeness: this.latest.centrality.closeness,
      betweenness: this.latest.centrality.betweenness
    };
  }

  async getBottlenecks(force = false) {
    if (force || !this.latest) {
      await this.compute(force ? 'force:bottlenecks' : 'bootstrap');
    }
    return {
      generatedAt: this.latest.generatedAt,
      computeMs: this.latest.computeMs,
      graph: this.latest.graph,
      bottlenecks: this.latest.bottlenecks
    };
  }

  async getStability(force = false) {
    if (force || !this.latest) {
      await this.compute(force ? 'force:stability' : 'bootstrap');
    }
    return {
      generatedAt: this.latest.generatedAt,
      computeMs: this.latest.computeMs,
      graph: this.latest.graph,
      stability: this.latest.stability
    };
  }

  initializeRealtime() {
    if (this.isInitialized) return;

    const recomputeAndEmit = async (trigger, sourceEvent) => {
      try {
        const latest = await this.compute(trigger);
        broadcast('graph_update', {
          trigger,
          generatedAt: latest.generatedAt,
          computeMs: latest.computeMs,
          criticalHospitals: latest.centrality.ranking.slice(0, 5),
          bottlenecks: latest.bottlenecks.slice(0, 5),
          stabilityScore: latest.stability.score,
          sourceEvent: sourceEvent || null
        });
      } catch (error) {
        broadcast('graph_update', {
          trigger,
          error: error.message,
          criticalHospitals: [],
          bottlenecks: [],
          stabilityScore: 0
        });
      }
    };

    eventBus.subscribe('emergency:created', (event) => recomputeAndEmit('emergency:created', event.payload));
    eventBus.subscribe('emergency_created', (event) => recomputeAndEmit('emergency_created', event.payload));
    eventBus.subscribe('inventory:updated', (event) => recomputeAndEmit('inventory:updated', event.payload));
    eventBus.subscribe('inventory_updated', (event) => recomputeAndEmit('inventory_updated', event.payload));
    eventBus.subscribe('transfer:initiated', (event) => recomputeAndEmit('transfer:initiated', event.payload));
    eventBus.subscribe('transfer:completed', (event) => recomputeAndEmit('transfer:completed', event.payload));

    this.isInitialized = true;
  }
}

module.exports = new GraphIntelligenceService();
