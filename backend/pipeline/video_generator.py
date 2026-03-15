import os
import time
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
OUTPUTS_DIR = BASE_DIR / "backend" / "outputs" / "videos"


def generate_video(thumbnail_path, music_path):
  if not thumbnail_path or not os.path.exists(thumbnail_path):
    raise FileNotFoundError(f"Thumbnail not found: {thumbnail_path}")
  if not music_path or not os.path.exists(music_path):
    raise FileNotFoundError(f"Music file not found: {music_path}")

  OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
  output = OUTPUTS_DIR / f"video_{int(time.time())}.mp4"

  cmd = [
    "ffmpeg",
    "-y",
    "-loop",
    "1",
    "-i",
    str(thumbnail_path),
    "-i",
    str(music_path),
    "-vf",
    "scale=1920:1080",
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    str(output)
  ]

  subprocess.run(cmd, check=True)
  return str(output)
