from fastapi import FastAPI
from pydantic import BaseModel

from pipeline import run_research_pipeline


app = FastAPI(title="ResearchMind API")


class ResearchRequest(BaseModel):
    topic: str


@app.get("/")
def root():
    return {"message": "ResearchMind API is running"}


@app.post("/research")
def research(request: ResearchRequest):

    result = run_research_pipeline(request.topic)

    return result