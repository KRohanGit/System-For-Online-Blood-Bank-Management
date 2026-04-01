import time
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import predict, federated, simulation, optimization, synthetic
from app.routes import digital_twin, rl_agent, graph_intelligence

START_TIME = time.time()

app = FastAPI(
    title="LifeLink ML Intelligence Service",
    version="1.0.0",
    description="AI-powered blood demand forecasting & emergency intelligence"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(federated.router)
app.include_router(simulation.router)
app.include_router(optimization.router)
app.include_router(synthetic.router)
app.include_router(digital_twin.router)
app.include_router(rl_agent.router)
app.include_router(graph_intelligence.router)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "ml-intelligence",
        "version": "1.0.0",
        "uptime_seconds": round(time.time() - START_TIME, 2)
    }
