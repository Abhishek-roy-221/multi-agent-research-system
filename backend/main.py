from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from pipeline import run_research_pipeline

import json
import queue
import threading


app = FastAPI(title="ResearchMind API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://researchmind-neon.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    topic: str


@app.get("/")
def root():
    return {"message": "ResearchMind API is running"}


@app.post("/research")
def research(request: ResearchRequest):
    result = run_research_pipeline(request.topic)
    return result


@app.post("/research/stream")
def research_stream(request: ResearchRequest):

    updates = queue.Queue()

    def update_status(stage, status):
        updates.put({
            "type": "status",
            "stage": stage,
            "status": status
        })

    def run_pipeline():
        try:
            result = run_research_pipeline(
                request.topic,
                status_callback=update_status
            )

            updates.put({
                "type": "result",
                "data": result
            })

        except Exception as e:
            import traceback

            traceback.print_exc()

            updates.put({
                "type": "error",
                "message": str(e)
            })

        finally:
            updates.put(None)

    thread = threading.Thread(target=run_pipeline)
    thread.start()

    def event_stream():
        while True:
            update = updates.get()

            if update is None:
                break

            yield f"data: {json.dumps(update)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream"
    )