from fastapi import APIRouter, Query
from app.services.graph_intelligence import graph_engine

router = APIRouter(prefix="/graph", tags=["Graph Intelligence"])


@router.get("/centrality")
async def get_centrality(metric: str = Query(default="all")):
    return graph_engine.get_centrality(metric=metric)


@router.get("/bottlenecks")
async def get_bottlenecks(threshold: float = Query(default=0.3, ge=0.0, le=1.0)):
    return graph_engine.get_bottlenecks(threshold=threshold)


@router.get("/stability-index")
async def get_stability_index():
    return graph_engine.get_stability_index()
