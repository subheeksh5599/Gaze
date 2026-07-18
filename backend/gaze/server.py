"""Gaze Verdict Engine — FastAPI server."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Gaze", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class VerdictRequest(BaseModel):
    agent_id: str
    window: str = "1h"


class RuleTrigger(BaseModel):
    rule: str
    severity: str
    evidence_span: str
    detail: str


class VerdictResponse(BaseModel):
    verdict_id: str
    agent_id: str
    timestamp: str
    score: int
    status: str
    verdict_hash: str
    rules_evaluated: int
    rules_triggered: list[RuleTrigger]
    evidence: list[dict]


@app.get("/health")
async def health():
    return {"status": "ok", "engine": "gaze"}


@app.post("/verdict", response_model=VerdictResponse)
async def get_verdict(req: VerdictRequest):
    # TODO: Wire to SigNoz MCP for real trace data
    return {
        "verdict_id": f"v_{hash(req.agent_id) % 0xFFFFFFFF:08x}",
        "agent_id": req.agent_id,
        "timestamp": "2026-07-22T14:30:00Z",
        "score": 94,
        "status": "HEALTHY",
        "verdict_hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "rules_evaluated": 9,
        "rules_triggered": [],
        "evidence": [],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
