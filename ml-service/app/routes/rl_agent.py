from fastapi import APIRouter
from app.models.advanced_schemas import (
    RLTrainRequest, RLTrainResponse,
    RLSimulateRequest, RLSimulateResponse
)
from app.services.rl_agent import rl_agent

router = APIRouter(prefix="/rl-agent", tags=["RL Agent"])


@router.post("/train", response_model=RLTrainResponse)
async def train_agent(request: RLTrainRequest):
    result = rl_agent.train(
        episodes=request.episodes,
        algorithm=request.algorithm,
        max_hospitals=request.max_hospitals
    )
    return result


@router.post("/simulate", response_model=RLSimulateResponse)
async def simulate_allocation(request: RLSimulateRequest):
    result = rl_agent.simulate_allocation(
        strategy=request.strategy,
        duration_days=request.duration_days
    )
    return result


@router.get("/policy")
async def get_policy():
    return rl_agent.get_policy()
