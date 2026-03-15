import json
import logging
import shutil
import traceback
from pathlib import Path

from analysis.lyrics_analyzer import analyze_lyrics
from image_generation.generate_image import generate_image
from video.create_video import create_video
from youtube.upload_video import upload_video

BASE_DIR = Path(__file__).resolve().parents[2]
JOBS_DIR = BASE_DIR / "jobs"
LOGS_DIR = BASE_DIR / "logs"


def _setup_logger():
  LOGS_DIR.mkdir(parents=True, exist_ok=True)
  log_file = LOGS_DIR / "pipeline.log"
  logger = logging.getLogger("pipeline")
  logger.setLevel(logging.INFO)
  if not logger.handlers:
    handler = logging.FileHandler(log_file)
    formatter = logging.Formatter("%(asctime)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
  return logger


def _job_dir(job_id):
  path = JOBS_DIR / job_id
  path.mkdir(parents=True, exist_ok=True)
  return path


def _write_state(job_id, state):
  path = _job_dir(job_id) / "state.json"
  path.write_text(json.dumps(state, ensure_ascii=False, indent=2))


def _update_state(job_id, **kwargs):
  path = _job_dir(job_id) / "state.json"
  if path.exists():
    state = json.loads(path.read_text())
  else:
    state = {"job_id": job_id, "status": "queued"}
  state.update(kwargs)
  _write_state(job_id, state)

def _first_line(lyrics):
  for line in lyrics.splitlines():
    line = line.strip()
    if line:
      return line
  return ""

def _clamp(text, max_len):
  text = text.strip()
  if len(text) <= max_len:
    return text
  return text[:max_len].rstrip()

def _ensure_unique_metadata(title, description, lyrics):
  hook = _first_line(lyrics)
  hook_short = _clamp(hook, 30)

  if hook_short and hook_short.lower() not in title.lower():
    if title:
      candidate = f"{title} | {hook_short}"
      title = _clamp(candidate, 90)
    else:
      title = hook_short

  if hook and hook.lower() not in description.lower():
    if description:
      description = f"{hook}\n\n{description}"
    else:
      description = hook

  return title, description


def run_job(job_id, payload):
  logger = _setup_logger()
  _update_state(job_id, status="running")

  job_path = _job_dir(job_id)
  lyrics = payload.get("lyrics", "").strip()
  if not lyrics:
    raise ValueError("Lyrics are empty")

  lyrics_filename = payload.get("lyrics_filename") or f"lyrics_{job_id}.txt"
  (job_path / lyrics_filename).write_text(lyrics, encoding="utf-8")

  style = payload.get("style")
  requested_title = payload.get("title")

  try:
    analysis = analyze_lyrics(lyrics, style=style, requested_title=requested_title)
    (job_path / "analysis.json").write_text(json.dumps(analysis, ensure_ascii=False, indent=2))
    _update_state(job_id, status="analysis_complete", analysis=analysis)

    thumb_path = generate_image(analysis)
    thumb_copy = job_path / Path(thumb_path).name
    shutil.copyfile(thumb_path, thumb_copy)
    _update_state(job_id, status="image_complete", thumbnail=str(thumb_copy))

    audio_path = payload.get("music_path")
    video_path = create_video(str(thumb_copy), audio_path=audio_path)
    video_copy = job_path / Path(video_path).name
    shutil.copyfile(video_path, video_copy)
    _update_state(job_id, status="video_complete", video=str(video_copy))

    title = analysis.get("youtube_title", "")
    description = analysis.get("youtube_description", "")
    title, description = _ensure_unique_metadata(title, description, lyrics)
    tags = analysis.get("youtube_tags", [])

    video_id = upload_video(str(video_copy), title, description, tags, str(thumb_copy))
    _update_state(job_id, status="uploaded", video_id=video_id)

    logger.info(
      "file=%s | mood=%s | title=%s | video_id=%s",
      lyrics_filename,
      analysis.get("mood", ""),
      title,
      video_id
    )

    _update_state(job_id, status="done")

  except Exception as err:
    logger.info("file=%s | error=%s", lyrics_filename, err)
    _update_state(job_id, status="failed", error=str(err), traceback=traceback.format_exc())
    raise
