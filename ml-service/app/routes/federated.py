from fastapi import APIRouter, HTTPException
from ..models.schemas import (
    FederatedTrainRequest, FederatedTrainResponse,
    FederatedAggregateRequest, FederatedAggregateResponse
)
from ..services.federated_learning import federated_service

router = APIRouter(prefix="/federated", tags=["Federated Learning"])


@router.post("/train", response_model=FederatedTrainResponse)
async def federated_train(request: FederatedTrainRequest):
    try:
        result = federated_service.train(
            hospital_ids=request.hospital_ids,
            model_type=request.model_type,
            rounds=request.rounds,
            min_samples=request.min_samples
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/aggregate", response_model=FederatedAggregateResponse)
async def federated_aggregate(request: FederatedAggregateRequest):
    try:
        result = federated_service.aggregate(
            session_id=request.session_id,
            local_weights=request.local_weights,
            aggregation_strategy=request.aggregation_strategy
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = federated_service.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "participating_hospitals": session.get("participating", []),
        "model_type": session.get("model_type", ""),
        "has_weights": "weights" in session
    }
