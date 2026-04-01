from fastapi import APIRouter, HTTPException
from ..models.schemas import (
    DemandPredictionRequest, DemandPredictionResponse,
    CrisisPredictionRequest, CrisisPredictionResponse,
    DonorReturnRequest, DonorReturnResponse,
    WastagePredictionRequest, WastagePredictionResponse,
    AnomalyDetectionRequest, AnomalyDetectionResponse,
    HospitalRankingRequest, HospitalRankingResponse
)
from ..services.demand_forecasting import demand_forecaster
from ..services.crisis_prediction import crisis_predictor
from ..services.donor_prediction import donor_return_predictor
from ..services.wastage_prediction import wastage_predictor
from ..services.anomaly_detection import anomaly_detector
from ..services.hospital_ranking import hospital_ranker

router = APIRouter(prefix="/predict", tags=["Predictions"])


@router.post("/demand", response_model=DemandPredictionResponse)
async def predict_demand(request: DemandPredictionRequest):
    try:
        result = demand_forecaster.predict(
            hospital_id=request.hospital_id,
            blood_group=request.blood_group.value,
            horizon_days=request.horizon_days,
            include_confidence=request.include_confidence
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/crisis", response_model=CrisisPredictionResponse)
async def predict_crisis(request: CrisisPredictionRequest):
    try:
        result = crisis_predictor.predict(
            hospital_id=request.hospital_id,
            lookahead_hours=request.lookahead_hours
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/donor-return", response_model=DonorReturnResponse)
async def predict_donor_return(request: DonorReturnRequest):
    try:
        result = donor_return_predictor.predict(
            donor_id=request.donor_id,
            donation_history=request.donation_history,
            demographics=request.demographics
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/wastage", response_model=WastagePredictionResponse)
async def predict_wastage(request: WastagePredictionRequest):
    try:
        bg = request.blood_group.value if request.blood_group else None
        result = wastage_predictor.predict(
            hospital_id=request.hospital_id,
            blood_group=bg,
            horizon_days=request.horizon_days
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/anomalies", response_model=AnomalyDetectionResponse)
async def detect_anomalies(request: AnomalyDetectionRequest):
    try:
        result = anomaly_detector.detect(
            hospital_id=request.hospital_id,
            metric_type=request.metric_type,
            time_window_hours=request.time_window_hours
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hospital-ranking", response_model=HospitalRankingResponse)
async def rank_hospitals(request: HospitalRankingRequest):
    try:
        result = hospital_ranker.rank(
            blood_group=request.blood_group.value,
            urgency=request.urgency.value,
            patient_location=request.patient_location,
            units_needed=request.units_needed,
            max_distance_km=request.max_distance_km
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
