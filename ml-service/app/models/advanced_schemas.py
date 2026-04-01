from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional


class DigitalTwinSimulateRequest(BaseModel):
    scenario: str = Field(default="baseline")
    parameters: Dict[str, Any] = {}
    duration_days: int = Field(default=14, ge=1, le=365)
    monte_carlo_runs: int = Field(default=200, ge=20, le=5000)


class DigitalTwinSimulateResponse(BaseModel):
    scenario: str
    digital_twin_state: Dict[str, Any]
    duration_days: int
    monte_carlo_runs: int
    timeline: List[Dict[str, Any]]
    crisis_detection: Dict[str, Any]
    resilience_score: Dict[str, Any]
    most_critical_blood_groups: List[str]
    decision_support: Dict[str, Any]
    confidence_score: float
    recommended_actions: List[Dict[str, Any]]
    key_insights: List[str]
    strategy_comparison: List[Dict[str, Any]]
    resilience_assessment: Dict[str, Any]
    network_visualization: Dict[str, Any]
    decision_output: Dict[str, Any]
    network_optimization: Dict[str, Any]
    rl_policy_hint: Dict[str, Any]
    generated_at: str


class DigitalTwinCompareRequest(BaseModel):
    scenarios: List[str] = Field(default=["baseline", "disaster", "donor_campaign"])
    parameters: Dict[str, Any] = {}
    duration_days: int = Field(default=14, ge=1, le=365)
    monte_carlo_runs: int = Field(default=200, ge=20, le=5000)


class DigitalTwinCompareResponse(BaseModel):
    comparison: Dict[str, Any]
    best_strategy: Dict[str, Any]
    generated_at: str


class DigitalTwinStrategyRecommendationRequest(BaseModel):
    parameters: Dict[str, Any] = {}
    duration_days: int = Field(default=14, ge=1, le=365)
    monte_carlo_runs: int = Field(default=200, ge=20, le=5000)


class DigitalTwinStrategyRecommendationResponse(BaseModel):
    message: str
    recommendation: Dict[str, Any]
    generated_at: str


class RLTrainRequest(BaseModel):
    episodes: int = Field(default=50, ge=10, le=500)
    algorithm: str = Field(default="policy_gradient")
    max_hospitals: int = Field(default=10, ge=2, le=50)


class RLTrainResponse(BaseModel):
    algorithm: str
    episodes_trained: int
    hospital_count: int
    final_reward: float
    avg_reward_last_10: float
    reward_trend: List[float]
    final_metrics: Dict[str, Any]
    policy_info: Dict[str, Any]
    convergence: Dict[str, Any]
    generated_at: str


class RLSimulateRequest(BaseModel):
    strategy: str = Field(default="optimal")
    duration_days: int = Field(default=30, ge=1, le=365)


class RLSimulateResponse(BaseModel):
    strategy: str
    duration_days: int
    transfers: List[Dict[str, Any]]
    transfer_count: int
    daily_metrics: List[Dict[str, Any]]
    final_metrics: Dict[str, Any]
    generated_at: str


class GraphCentralityRequest(BaseModel):
    metric: str = Field(default="all")


class GraphCentralityResponse(BaseModel):
    node_count: int
    edge_count: int
    degree_centrality: Optional[Dict[str, float]] = None
    closeness_centrality: Optional[Dict[str, float]] = None
    betweenness_centrality: Optional[Dict[str, float]] = None
    pagerank: Optional[Dict[str, float]] = None
    top_hospitals: Optional[List[Dict[str, Any]]] = None
    generated_at: str


class GraphBottleneckRequest(BaseModel):
    threshold: float = Field(default=0.3, ge=0.0, le=1.0)


class GraphBottleneckResponse(BaseModel):
    bottleneck_count: int
    bottlenecks: List[Dict[str, Any]]
    threshold_used: float
    recommendations: List[str]
    generated_at: str


class GraphStabilityResponse(BaseModel):
    stability_index: float
    rating: str
    components: Dict[str, float]
    network_stats: Dict[str, Any]
    recommendations: List[str]
    generated_at: str
