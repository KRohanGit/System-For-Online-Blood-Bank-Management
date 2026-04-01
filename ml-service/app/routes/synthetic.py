from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from ..services.synthetic_data import synthetic_engine

router = APIRouter(prefix="/synthetic", tags=["Synthetic Data"])


class SyntheticGenerateRequest(BaseModel):
    data_type: str
    count: int = Field(default=100, ge=1, le=10000)
    hospital_ids: Optional[List[str]] = None
    seed: int = 42


@router.post("/generate")
async def generate_synthetic_data(request: SyntheticGenerateRequest):
    try:
        result = synthetic_engine.generate(
            data_type=request.data_type,
            count=request.count,
            hospital_ids=request.hospital_ids,
            seed=request.seed
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types")
async def list_data_types():
    return {
        "available_types": [
            {
                "type": "donors",
                "description": "Synthetic donor profiles with demographics and donation history",
                "fields": ["donor_id", "age", "gender", "blood_group", "city", "weight_kg",
                          "hemoglobin", "total_donations", "days_since_last_donation", "eligible"]
            },
            {
                "type": "emergency_requests",
                "description": "Synthetic emergency blood requests",
                "fields": ["request_id", "requestingHospitalId", "patientInfo", "unitsRequired",
                          "urgencyLevel", "lifecycleStatus"]
            },
            {
                "type": "inventory",
                "description": "Synthetic blood inventory units",
                "fields": ["unit_id", "hospital", "bloodGroup", "component", "status",
                          "collectionDate", "expiryDate", "volume_ml"]
            }
        ]
    }
