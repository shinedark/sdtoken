from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StreamData(BaseModel):
    store_name: str
    stream_count: int
    earnings: float
    period_start: datetime
    period_end: datetime
    video_proof_url: str

# In-memory storage (replace with database in production)
streams_data = []

@app.post("/api/streams")
async def add_stream_data(data: StreamData):
    streams_data.append(data.dict())
    return {"message": "Data added successfully", "data": data}

@app.get("/api/streams")
async def get_streams():
    return {"streams": streams_data}

@app.get("/api/earnings")
async def get_earnings():
    total_earnings = sum(stream["earnings"] for stream in streams_data)
    return {"total_earnings": total_earnings}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 