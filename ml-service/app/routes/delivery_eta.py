from fastapi import APIRouter, HTTPException

from ..models.schemas import DeliveryEtaRequest, DeliveryEtaResponse, DeliveryEtaRetrainResponse
from ..services.delivery_eta import delivery_eta_predictor

router = APIRouter(prefix='/delivery-eta', tags=['Delivery ETA'])


@router.post('/predict', response_model=DeliveryEtaResponse)
async def predict_delivery_eta(request: DeliveryEtaRequest):
    try:
        result = delivery_eta_predictor.predict(request.model_dump())
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post('/retrain', response_model=DeliveryEtaRetrainResponse)
async def retrain_delivery_eta_model():
    try:
        return delivery_eta_predictor.retrain()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
