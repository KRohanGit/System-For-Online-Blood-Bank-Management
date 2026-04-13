from fastapi import APIRouter, HTTPException

from ..models.schemas import (
    ClinicalRetrainRequest,
    ClinicalRetrainResponse,
    FindSimilarCasesRequest,
    FindSimilarCasesResponse,
    PredictOutcomeRequest,
    PredictOutcomeResponse,
    RecommendTreatmentRequest,
    RecommendTreatmentResponse,
)
from ..services.clinical_recommendations import clinical_recommendation_engine

router = APIRouter(prefix='/clinical', tags=['Clinical Recommendations'])


@router.post('/find-similar-cases', response_model=FindSimilarCasesResponse)
async def find_similar_cases(request: FindSimilarCasesRequest):
    try:
        return clinical_recommendation_engine.find_similar_cases(
            request.patient_features.model_dump(),
            request.top_k,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post('/recommend-treatment', response_model=RecommendTreatmentResponse)
async def recommend_treatment(request: RecommendTreatmentRequest):
    try:
        return clinical_recommendation_engine.recommend_treatment(
            request.patient_features.model_dump(),
            request.top_k,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post('/predict-outcome', response_model=PredictOutcomeResponse)
async def predict_outcome(request: PredictOutcomeRequest):
    try:
        return clinical_recommendation_engine.predict_outcome(
            request.patient_features.model_dump(),
            request.treatment_plan.model_dump(),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post('/retrain', response_model=ClinicalRetrainResponse)
async def retrain_models(request: ClinicalRetrainRequest):
    try:
        return clinical_recommendation_engine.retrain_if_needed(force=request.force_retrain)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
