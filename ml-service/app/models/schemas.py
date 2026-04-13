from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class BloodGroup(str, Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"


class UrgencyLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ApiModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


class DemandPredictionRequest(ApiModel):
    hospital_id: str
    blood_group: BloodGroup
    horizon_days: int = Field(default=7, ge=1, le=90)
    include_confidence: bool = True


class DemandPredictionResponse(ApiModel):
    hospital_id: str
    blood_group: str
    predictions: List[Dict[str, Any]]
    confidence_interval: Optional[Dict[str, Any]] = None
    model_version: str
    generated_at: str


class CrisisPredictionRequest(ApiModel):
    hospital_id: str
    region: Optional[str] = None
    lookahead_hours: int = Field(default=48, ge=1, le=168)


class CrisisPredictionResponse(ApiModel):
    hospital_id: str
    crisis_probability: float
    risk_level: UrgencyLevel
    contributing_factors: List[Dict[str, Any]]
    recommended_actions: List[str]
    predicted_shortages: List[Dict[str, Any]]
    model_version: str
    generated_at: str


class DonorReturnRequest(ApiModel):
    donor_id: str
    donation_history: List[Dict[str, Any]]
    demographics: Dict[str, Any]


class DonorReturnResponse(ApiModel):
    donor_id: str
    return_probability: float
    expected_return_date: Optional[str] = None
    engagement_score: float
    churn_risk: str
    retention_suggestions: List[str]
    model_version: str
    generated_at: str


class WastagePredictionRequest(ApiModel):
    hospital_id: str
    blood_group: Optional[BloodGroup] = None
    horizon_days: int = Field(default=14, ge=1, le=60)


class WastagePredictionResponse(ApiModel):
    hospital_id: str
    at_risk_units: List[Dict[str, Any]]
    wastage_probability: float
    fifo_recommendations: List[Dict[str, Any]]
    cost_impact: Dict[str, Any]
    model_version: str
    generated_at: str


class AnomalyDetectionRequest(ApiModel):
    hospital_id: Optional[str] = None
    metric_type: str = Field(default="inventory")
    time_window_hours: int = Field(default=24, ge=1, le=720)


class AnomalyDetectionResponse(ApiModel):
    anomalies: List[Dict[str, Any]]
    total_checked: int
    anomaly_count: int
    severity_distribution: Dict[str, int]
    model_version: str
    generated_at: str


class HospitalRankingRequest(ApiModel):
    blood_group: BloodGroup
    urgency: UrgencyLevel
    patient_location: Dict[str, float]
    units_needed: int = Field(default=1, ge=1, le=50)
    max_distance_km: float = Field(default=50.0, ge=1.0, le=500.0)


class HospitalRankingResponse(ApiModel):
    ranked_hospitals: List[Dict[str, Any]]
    total_evaluated: int
    fulfillment_probability: float
    model_version: str
    generated_at: str


class DeliveryEtaRequest(ApiModel):
    distance_km: float = Field(gt=0)
    base_eta_minutes: float = Field(gt=0)
    hour_of_day: int = Field(default=0, ge=0, le=23)
    day_of_week: int = Field(default=0, ge=0, le=6)
    traffic_ratio: float = Field(default=1.0, ge=1.0, le=5.0)
    weather_score: Optional[float] = Field(default=0.5, ge=0.0, le=1.0)
    priority_flag: int = Field(default=0, ge=0, le=1)


class DeliveryEtaResponse(ApiModel):
    distance_km: float
    base_eta_minutes: float
    ml_eta_minutes: float
    predicted_eta_minutes: float
    confidence: float
    model_version: str
    model_name: str
    metrics: Dict[str, Any]
    feature_importance: Dict[str, float]
    generated_at: str


class DeliveryEtaRetrainResponse(ApiModel):
    retrained: bool
    model_version: str
    sample_size: int
    metrics: Dict[str, Any]
    generated_at: str


class FederatedTrainRequest(ApiModel):
    hospital_ids: List[str]
    model_type: str = Field(default="demand_forecast")
    rounds: int = Field(default=5, ge=1, le=50)
    min_samples: int = Field(default=100, ge=10)


class FederatedTrainResponse(ApiModel):
    session_id: str
    participating_hospitals: int
    rounds_completed: int
    global_metrics: Dict[str, float]
    per_hospital_metrics: Dict[str, Dict[str, float]]
    model_version: str
    completed_at: str


class FederatedAggregateRequest(ApiModel):
    session_id: str
    local_weights: List[Dict[str, Any]]
    aggregation_strategy: str = Field(default="fedavg")


class FederatedAggregateResponse(ApiModel):
    session_id: str
    aggregated: bool
    global_loss: float
    convergence_delta: float
    model_version: str


class SimulationRequest(ApiModel):
    scenario_type: str
    parameters: Dict[str, Any]
    duration_days: int = Field(default=30, ge=1, le=365)
    monte_carlo_runs: int = Field(default=100, ge=10, le=10000)


class SimulationResponse(ApiModel):
    scenario_type: str
    results: Dict[str, Any]
    statistics: Dict[str, Any]
    confidence_intervals: Dict[str, Dict[str, float]]
    recommendations: List[str]
    generated_at: str


class CausalQueryRequest(ApiModel):
    treatment: str
    outcome: str
    confounders: List[str] = []
    data_filters: Optional[Dict[str, Any]] = None


class CausalQueryResponse(ApiModel):
    treatment: str
    outcome: str
    causal_effect: float
    confidence_interval: Dict[str, float]
    p_value: float
    interpretation: str
    generated_at: str


class OptimizationRequest(ApiModel):
    objective: str = Field(default="minimize_waste")
    constraints: Dict[str, Any] = {}
    hospital_ids: Optional[List[str]] = None
    blood_groups: Optional[List[BloodGroup]] = None
    time_horizon_days: int = Field(default=7, ge=1, le=90)


class OptimizationResponse(ApiModel):
    objective: str
    optimal_transfers: List[Dict[str, Any]]
    expected_improvement: Dict[str, float]
    cost_savings: float
    constraint_satisfaction: Dict[str, bool]
    solver_info: Dict[str, Any]
    generated_at: str


class QuantumOptimizationRequest(ApiModel):
    hospital_ids: List[str]
    blood_groups: List[BloodGroup]
    objective: str = Field(default="maximize_fulfillment")
    num_qubits: int = Field(default=8, ge=4, le=20)


class QuantumOptimizationResponse(ApiModel):
    objective: str
    solution: Dict[str, Any]
    energy: float
    feasible: bool
    comparison_classical: Optional[Dict[str, Any]] = None
    generated_at: str


class HealthResponse(ApiModel):
    status: str
    version: str
    models_loaded: Dict[str, bool]
    uptime_seconds: float
    timestamp: str


class ClinicalVitals(ApiModel):
    systolicBP: Optional[float] = None
    diastolicBP: Optional[float] = None
    heartRate: Optional[float] = None


class ClinicalPatientFeatures(ApiModel):
    age: float
    gender: str = Field(default='unknown')
    bloodGroup: BloodGroup
    hemoglobinLevel: float
    bloodLossEstimate: float
    conditionType: str
    vitals: Optional[ClinicalVitals] = None
    additionalClinicalContext: Optional[str] = None


class ClinicalTreatmentPlan(ApiModel):
    unitsGiven: float = Field(default=0, ge=0, le=20)
    bloodTypeUsed: BloodGroup
    timing: str = Field(default='unknown')


class FindSimilarCasesRequest(ApiModel):
    patient_features: ClinicalPatientFeatures
    top_k: int = Field(default=10, ge=1, le=50)


class SimilarClinicalCaseItem(ApiModel):
    caseId: str
    similarityScore: float
    conditionType: str
    bloodGroup: str
    treatmentSummary: Dict[str, Any]
    outcomeSummary: Dict[str, Any]


class FindSimilarCasesResponse(ApiModel):
    similarCases: List[SimilarClinicalCaseItem]
    queryEmbedding: List[float]
    basedOnCases: int
    modelVersion: str
    generatedAt: str


class RecommendTreatmentRequest(ApiModel):
    patient_features: ClinicalPatientFeatures
    top_k: int = Field(default=10, ge=1, le=50)


class RecommendTreatmentResponse(ApiModel):
    recommendedUnits: int
    preferredBloodGroup: str
    confidenceScore: float
    basedOnCases: int
    successRate: str
    reasoning: str
    evidenceSummary: Dict[str, Any]
    generatedAt: str


class PredictOutcomeRequest(ApiModel):
    patient_features: ClinicalPatientFeatures
    treatment_plan: ClinicalTreatmentPlan


class FeatureImportanceItem(ApiModel):
    feature: str
    importance: float


class PredictOutcomeResponse(ApiModel):
    survivalProbability: float
    riskLevel: str
    featureImportance: List[FeatureImportanceItem]
    reasoning: str
    modelVersion: str
    generatedAt: str


class ClinicalRetrainRequest(ApiModel):
    force_retrain: bool = False


class ClinicalRetrainResponse(ApiModel):
    retrained: bool
    modelVersion: str
    trainingSampleSize: int
    generatedAt: str
