import json
import logging
import shutil
from pathlib import Path

from analysis.lyrics_analyzer import analyze_lyrics
from image_generation.generate_image import generate_image
from video.create_video import create_video
from youtube.upload_video import upload_video

BASE_DIR = Path(__file__).resolve().parent
LYRICS_DIR = BASE_DIR / "lyrics"
PROCESSED_DIR = LYRICS_DIR / "processed"
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


def _read_lyrics_files():
  LYRICS_DIR.mkdir(parents=True, exist_ok=True)
  PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
  return sorted(LYRICS_DIR.glob("*.txt"))


def _safe_list(value):
  if isinstance(value, list):
    return value
  if value is None:
    return []
  if isinstance(value, str):
    return [v.strip() for v in value.split(",") if v.strip()]
  return [str(value)]

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


def process_file(path, logger):
  lyrics = path.read_text(encoding="utf-8").strip()
  if not lyrics:
    raise ValueError("Lyrics file is empty")

  analysis = analyze_lyrics(lyrics)
  thumb_path = generate_image(analysis)
  video_path = create_video(thumb_path)

  title = analysis.get("youtube_title", "")
  description = analysis.get("youtube_description", "")
  title, description = _ensure_unique_metadata(title, description, lyrics)
  tags = _safe_list(analysis.get("youtube_tags"))

  video_id = upload_video(video_path, title, description, tags, thumb_path)

  logger.info(
    "file=%s | mood=%s | title=%s | video_id=%s",
    path.name,
    analysis.get("mood", ""),
    title,
    video_id
  )

  dest = PROCESSED_DIR / path.name
  shutil.move(str(path), str(dest))


def main():
  logger = _setup_logger()
  files = _read_lyrics_files()
  if not files:
    print("No lyrics files found in lyrics/")
    return

  for path in files:
    try:
      print(f"Processing: {path.name}")
      process_file(path, logger)
      print(f"Done: {path.name}")
    except Exception as err:
      logger.info("file=%s | error=%s", path.name, err)
      print(f"Error processing {path.name}: {err}")


if __name__ == "__main__":
  main()
