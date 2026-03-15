import json
import logging
import traceback
from pathlib import Path

from backend.pipeline.lyrics_analyzer import analyze_lyrics
from backend.pipeline.image_generator import generate_image
from backend.pipeline.video_generator import generate_video
from backend.pipeline.youtube_uploader import upload_video

BASE_DIR = Path(__file__).resolve().parents[2]
LOGS_DIR = BASE_DIR / "backend" / "logs"


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


def _update_state(job_dir, **kwargs):
  state_path = Path(job_dir) / "state.json"
  if state_path.exists():
    state = json.loads(state_path.read_text())
  else:
    state = {}
  state.update(kwargs)
  state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2))


def _ensure_unique_metadata(title, description, lyrics):
  hook = next((line.strip() for line in lyrics.splitlines() if line.strip()), "")
  hook_short = hook[:30].strip()

  if hook_short and hook_short.lower() not in title.lower():
    title = f"{title} | {hook_short}" if title else hook_short

  if hook and hook.lower() not in description.lower():
    description = f"{hook}\n\n{description}" if description else hook

  return title.strip(), description.strip()


def run_job(job_id, payload):
  logger = _setup_logger()
  job_dir = payload.get("job_dir")
  lyrics = payload.get("lyrics", "")
  style = payload.get("style")
  requested_title = payload.get("title")
  music_path = payload.get("music_path")

  try:
    _update_state(job_dir, status="processing", step="analysis", job_id=job_id)

    analysis = analyze_lyrics(lyrics, style=style, requested_title=requested_title)
    analysis_path = Path(job_dir) / "analysis.json"
    analysis_path.write_text(json.dumps(analysis, ensure_ascii=False, indent=2))
    _update_state(job_dir, status="rendering", step="image", analysis=analysis, analysis_path=str(analysis_path))

    thumb_path = generate_image(analysis)
    _update_state(job_dir, status="rendering", step="video", thumbnail_path=thumb_path)

    video_path = generate_video(thumb_path, music_path)
    _update_state(job_dir, status="uploading", step="uploading", video_path=video_path)

    title = analysis.get("youtube_title", "")
    description = analysis.get("youtube_description", "")
    title, description = _ensure_unique_metadata(title, description, lyrics)
    tags = analysis.get("youtube_tags", [])

    video_id = upload_video(video_path, title, description, tags, thumb_path)
    video_url = f"https://www.youtube.com/watch?v={video_id}"

    _update_state(job_dir, status="done", step="done", video_id=video_id, video_url=video_url)

    logger.info(
      "job=%s | title=%s | mood=%s | youtube_title=%s | video_id=%s",
      job_id,
      requested_title or "",
      analysis.get("mood", ""),
      title,
      video_id
    )

  except Exception as err:
    logger.info("job=%s | error=%s", job_id, err)
    _update_state(job_dir, status="failed", error=str(err), traceback=traceback.format_exc())
    raise
