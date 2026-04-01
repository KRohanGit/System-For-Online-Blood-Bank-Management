from fastapi import APIRouter, HTTPException
from ..models.schemas import (
    SimulationRequest, SimulationResponse,
    CausalQueryRequest, CausalQueryResponse
)
from ..services.simulation import simulation_engine, causal_engine

router = APIRouter(prefix="/simulation", tags=["Simulation & Causal Inference"])


@router.post("/run", response_model=SimulationResponse)
async def run_simulation(request: SimulationRequest):
    try:
        result = simulation_engine.simulate(
            scenario_type=request.scenario_type,
            parameters=request.parameters,
            duration_days=request.duration_days,
            monte_carlo_runs=request.monte_carlo_runs
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/causal", response_model=CausalQueryResponse)
async def causal_query(request: CausalQueryRequest):
    try:
        result = causal_engine.query(
            treatment=request.treatment,
            outcome=request.outcome,
            confounders=request.confounders,
            data_filters=request.data_filters
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenarios")
async def list_scenarios():
    return {
        "available_scenarios": [
            {
                "type": "shortage",
                "description": "Simulate blood shortage under various conditions",
                "parameters": {
                    "demand_increase_factor": "float (default: 1.5)",
                    "supply_reduction_pct": "float 0-100 (default: 0)"
                }
            },
            {
                "type": "disaster",
                "description": "Simulate mass casualty disaster event",
                "parameters": {
                    "casualties": "int (default: 100)",
                    "units_per_patient": "int (default: 6)",
                    "severity_distribution": "dict with critical/severe/moderate/minor proportions"
                }
            },
            {
                "type": "donor_campaign",
                "description": "Simulate donor recruitment campaign impact",
                "parameters": {
                    "campaign_reach": "int (default: 1000)",
                    "conversion_rate": "float 0-1 (default: 0.05)",
                    "repeat_donation_rate": "float 0-1 (default: 0.3)"
                }
            }
        ]
    }
