from fastapi import APIRouter
from app.models.advanced_schemas import (
    DigitalTwinSimulateRequest,
    DigitalTwinSimulateResponse,
    DigitalTwinCompareRequest,
    DigitalTwinCompareResponse,
    DigitalTwinStrategyRecommendationRequest,
    DigitalTwinStrategyRecommendationResponse,
)
from app.services.digital_twin import digital_twin_engine

router = APIRouter(prefix="/digital-twin", tags=["Digital Twin"])


@router.post("/simulate", response_model=DigitalTwinSimulateResponse)
async def simulate_twin(request: DigitalTwinSimulateRequest):
    result = digital_twin_engine.simulate(
        scenario=request.scenario,
        params=request.parameters,
        duration_days=request.duration_days,
        monte_carlo_runs=request.monte_carlo_runs
    )
    return result


@router.post("/compare", response_model=DigitalTwinCompareResponse)
async def compare_scenarios(request: DigitalTwinCompareRequest):
    return digital_twin_engine.compare_scenarios(
        scenarios=request.scenarios,
        params=request.parameters,
        duration_days=request.duration_days,
        monte_carlo_runs=request.monte_carlo_runs,
    )


@router.post("/strategy-recommendation", response_model=DigitalTwinStrategyRecommendationResponse)
async def strategy_recommendation(request: DigitalTwinStrategyRecommendationRequest):
    return digital_twin_engine.recommend_best_strategy(
        params=request.parameters,
        duration_days=request.duration_days,
        monte_carlo_runs=request.monte_carlo_runs,
    )


@router.get("/status")
async def get_twin_status():
    return digital_twin_engine.get_status()


@router.get("/resilience-score")
async def get_resilience_score():
    return digital_twin_engine.get_resilience_score()
