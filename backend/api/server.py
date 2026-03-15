import json
import os
import uuid
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import threading

from backend.pipeline.job_runner import run_job

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOADS_DIR = BASE_DIR / "backend" / "uploads"
OUTPUTS_DIR = BASE_DIR / "backend" / "outputs"
JOBS_DIR = OUTPUTS_DIR / "jobs"

app = FastAPI()

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
)


def _job_path(job_id):
  path = JOBS_DIR / job_id
  path.mkdir(parents=True, exist_ok=True)
  return path


def _write_state(job_id, state):
  path = _job_path(job_id) / "state.json"
  path.write_text(json.dumps(state, ensure_ascii=False, indent=2))


def _read_state(job_id):
  path = _job_path(job_id) / "state.json"
  if not path.exists():
    return None
  return json.loads(path.read_text())


def _start_background(job_id, payload):
  thread = threading.Thread(target=run_job, args=(job_id, payload), daemon=True)
  thread.start()


@app.post("/api/generate-video")
async def generate_video(
  title: str = Form(""),
  style: str = Form("Trap"),
  lyrics: str = Form(...),
  music_file: UploadFile = File(None)
):
  if not lyrics.strip():
    raise HTTPException(status_code=400, detail="Lyrics are required")

  job_id = uuid.uuid4().hex
  job_dir = _job_path(job_id)

  UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
  OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

  lyrics_path = job_dir / "lyrics.txt"
  lyrics_path.write_text(lyrics, encoding="utf-8")

  music_path = None
  if music_file is None:
    raise HTTPException(status_code=400, detail="Music file is required")
  if music_file is not None:
    music_path = job_dir / music_file.filename
    with music_path.open("wb") as f:
      f.write(await music_file.read())

  payload = {
    "title": title,
    "style": style,
    "lyrics": lyrics,
    "music_path": str(music_path) if music_path else None,
    "job_dir": str(job_dir)
  }

  _write_state(job_id, {"status": "processing", "step": "analysis", "job_id": job_id})
  _start_background(job_id, payload)

  return {"status": "processing", "step": "analysis", "job_id": job_id}


@app.get("/job-status/{job_id}")
def job_status(job_id: str):
  state = _read_state(job_id)
  if not state:
    raise HTTPException(status_code=404, detail="Job not found")
  return state


@app.get("/job-status/{job_id}/download/{kind}")
def download_artifact(job_id: str, kind: str):
  state = _read_state(job_id)
  if not state:
    raise HTTPException(status_code=404, detail="Job not found")

  if kind == "analysis":
    path = state.get("analysis_path")
  elif kind == "thumbnail":
    path = state.get("thumbnail_path")
  elif kind == "video":
    path = state.get("video_path")
  else:
    raise HTTPException(status_code=400, detail="Invalid kind")

  if not path or not os.path.exists(path):
    raise HTTPException(status_code=404, detail="File not found")

  return FileResponse(path)
