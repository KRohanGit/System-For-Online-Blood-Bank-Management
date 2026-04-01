from fastapi import APIRouter, HTTPException
from ..models.schemas import (
    OptimizationRequest, OptimizationResponse,
    QuantumOptimizationRequest, QuantumOptimizationResponse
)
from ..services.optimization import classical_optimizer, quantum_optimizer

router = APIRouter(prefix="/optimize", tags=["Optimization"])


@router.post("/classical", response_model=OptimizationResponse)
async def optimize_classical(request: OptimizationRequest):
    try:
        bg_values = [bg.value for bg in request.blood_groups] if request.blood_groups else None
        if request.objective == "minimize_waste":
            result = classical_optimizer.optimize_minimize_waste(
                hospital_ids=request.hospital_ids,
                blood_groups=bg_values,
                time_horizon=request.time_horizon_days,
                constraints=request.constraints
            )
        elif request.objective == "maximize_fulfillment":
            result = classical_optimizer.optimize_maximize_fulfillment(
                hospital_ids=request.hospital_ids,
                blood_groups=bg_values,
                time_horizon=request.time_horizon_days,
                constraints=request.constraints
            )
        else:
            result = classical_optimizer.optimize_minimize_waste(
                hospital_ids=request.hospital_ids,
                blood_groups=bg_values,
                time_horizon=request.time_horizon_days,
                constraints=request.constraints
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quantum", response_model=QuantumOptimizationResponse)
async def optimize_quantum(request: QuantumOptimizationRequest):
    try:
        bg_values = [bg.value for bg in request.blood_groups]
        result = quantum_optimizer.optimize(
            hospital_ids=request.hospital_ids,
            blood_groups=bg_values,
            objective=request.objective,
            num_qubits=request.num_qubits
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare")
async def compare_optimizers(request: OptimizationRequest):
    try:
        bg_values = [bg.value for bg in request.blood_groups] if request.blood_groups else None
        classical_result = classical_optimizer.optimize_minimize_waste(
            hospital_ids=request.hospital_ids,
            blood_groups=bg_values,
            time_horizon=request.time_horizon_days,
            constraints=request.constraints
        )
        quantum_result = None
        if request.hospital_ids and len(request.hospital_ids) <= 10:
            quantum_result = quantum_optimizer.optimize(
                hospital_ids=request.hospital_ids,
                blood_groups=bg_values or ["O+", "O-", "A+", "B+"],
                objective=request.objective,
                num_qubits=8
            )
        return {
            "classical": {
                "transfers": len(classical_result.get("optimal_transfers", [])),
                "cost_savings": classical_result.get("cost_savings", 0),
                "method": classical_result.get("solver_info", {}).get("method", "")
            },
            "quantum_inspired": {
                "allocations": len(quantum_result["solution"]["allocations"]) if quantum_result else 0,
                "energy": quantum_result["energy"] if quantum_result else None,
                "feasible": quantum_result["feasible"] if quantum_result else None,
                "method": "simulated_annealing"
            } if quantum_result else None,
            "recommendation": "classical" if not quantum_result or classical_result.get("cost_savings", 0) > 0 else "quantum_inspired"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
