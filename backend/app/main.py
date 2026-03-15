import json
import os
import sys
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from redis import Redis
from rq import Queue

BASE_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(BASE_DIR))

from backend.app.tasks import run_job, _update_state  # noqa: E402

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = FastAPI()

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"] ,
  allow_headers=["*"]
)


def _queue():
  redis_conn = Redis.from_url(REDIS_URL)
  return Queue("default", connection=redis_conn)


def _job_dir(job_id):
  path = BASE_DIR / "jobs" / job_id
  path.mkdir(parents=True, exist_ok=True)
  return path


@app.post("/jobs")
async def create_job(
  lyrics: str = Form(...),
  style: str = Form(None),
  title: str = Form(None),
  music: UploadFile = File(None)
):
  job_id = uuid4().hex
  job_path = _job_dir(job_id)

  music_path = None
  if music is not None:
    music_path = job_path / music.filename
    with music_path.open("wb") as f:
      f.write(await music.read())

  payload = {
    "lyrics": lyrics,
    "style": style,
    "title": title,
    "music_path": str(music_path) if music_path else None,
    "lyrics_filename": f"lyrics_{job_id}.txt"
  }

  _update_state(job_id, status="queued")
  q = _queue()
  q.enqueue(run_job, job_id, payload, job_id=job_id)

  return {"job_id": job_id}


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
  state_path = BASE_DIR / "jobs" / job_id / "state.json"
  if not state_path.exists():
    raise HTTPException(status_code=404, detail="Job not found")
  return json.loads(state_path.read_text())


@app.get("/jobs/{job_id}/download/{kind}")
def download_artifact(job_id: str, kind: str):
  state_path = BASE_DIR / "jobs" / job_id / "state.json"
  if not state_path.exists():
    raise HTTPException(status_code=404, detail="Job not found")
  state = json.loads(state_path.read_text())

  if kind == "video":
    path = state.get("video")
  elif kind == "thumbnail":
    path = state.get("thumbnail")
  elif kind == "analysis":
    path = str(BASE_DIR / "jobs" / job_id / "analysis.json")
  else:
    raise HTTPException(status_code=400, detail="Invalid kind")

  if not path or not os.path.exists(path):
    raise HTTPException(status_code=404, detail="File not found")

  return FileResponse(path)
