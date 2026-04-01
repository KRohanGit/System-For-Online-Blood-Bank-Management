const RLPolicySnapshot = require('../../models/RLPolicySnapshot');
const eventBus = require('../realtime/eventBus');
const { broadcast } = require('../realtime/socketService');
const { buildState } = require('./stateBuilder');
const { computeAllocationRecommendations } = require('./policyEngine');

class RLAllocationAgentService {
  constructor() {
    this.latestState = null;
    this.latestRecommendations = [];
    this.latestSnapshotMeta = null;
    this.isInitialized = false;
    this.isComputing = false;
  }

  async compute(trigger = 'manual') {
    if (this.isComputing) {
      return {
        state: this.latestState,
        recommendations: this.latestRecommendations,
        snapshot: this.latestSnapshotMeta,
        skipped: true
      };
    }

    this.isComputing = true;
    const startedAt = Date.now();

    try {
      const state = await buildState();
      const recommendations = computeAllocationRecommendations(state, 25);
      const computeMs = Date.now() - startedAt;

      this.latestState = state;
      this.latestRecommendations = recommendations;
      this.latestSnapshotMeta = {
        trigger,
        computeMs,
        generatedAt: new Date().toISOString(),
        recommendationCount: recommendations.length
      };

      const hospitalCount = state.hospitals.length;
      const activeEmergencyCount = state.emergencies.length;
      const inventoryUnitTotal = state.hospitals.reduce((sum, h) => {
        return sum + Object.values(h.inventory_by_group || {}).reduce((acc, g) => acc + Number(g.available || 0), 0);
      }, 0);
      const expiringSoonUnitTotal = state.hospitals.reduce((sum, h) => {
        return sum + Object.values(h.inventory_by_group || {}).reduce((acc, g) => acc + Number(g.expiringSoon || 0), 0);
      }, 0);

      await RLPolicySnapshot.create({
        trigger,
        computeMs,
        policyVersion: 'rl-lite-v1',
        stateSummary: {
          hospitalCount,
          activeEmergencyCount,
          inventoryUnitTotal,
          expiringSoonUnitTotal
        },
        recommendations
      });

      return {
        state,
        recommendations,
        snapshot: this.latestSnapshotMeta
      };
    } finally {
      this.isComputing = false;
    }
  }

  async getRecommendations() {
    if (!this.latestState) {
      await this.compute('bootstrap');
    }
    return {
      recommendations: this.latestRecommendations,
      snapshot: this.latestSnapshotMeta
    };
  }

  async getState() {
    if (!this.latestState) {
      await this.compute('bootstrap');
    }
    return {
      state: this.latestState,
      snapshot: this.latestSnapshotMeta
    };
  }

  initializeRealtime() {
    if (this.isInitialized) return;

    const recomputeAndEmit = async (trigger, payload) => {
      try {
        const { recommendations, snapshot } = await this.compute(trigger);
        broadcast('rl_allocation_update', {
          trigger,
          generatedAt: snapshot?.generatedAt,
          computeMs: snapshot?.computeMs,
          recommendationCount: recommendations.length,
          recommendations,
          sourceEvent: payload || null
        });
      } catch (error) {
        broadcast('rl_allocation_update', {
          trigger,
          error: error.message,
          recommendations: []
        });
      }
    };

    eventBus.subscribe('emergency:created', (event) => {
      recomputeAndEmit('emergency:created', event.payload);
    });

    eventBus.subscribe('emergency_created', (event) => {
      recomputeAndEmit('emergency_created', event.payload);
    });

    eventBus.subscribe('inventory:updated', (event) => {
      recomputeAndEmit('inventory:updated', event.payload);
    });

    eventBus.subscribe('inventory_updated', (event) => {
      recomputeAndEmit('inventory_updated', event.payload);
    });

    eventBus.subscribe('unit:expiring_soon', (event) => {
      recomputeAndEmit('unit:expiring_soon', event.payload);
    });

    eventBus.subscribe('expiry_alert', (event) => {
      recomputeAndEmit('expiry_alert', event.payload);
    });

    this.isInitialized = true;
  }
}

const rlAllocationAgentService = new RLAllocationAgentService();

module.exports = rlAllocationAgentService;
