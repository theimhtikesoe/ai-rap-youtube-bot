import os
import time
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]


def _log(msg):
  print(f"[video] {msg}")


def _pick_latest_audio(audio_dir):
  audio_dir = Path(audio_dir)
  files = [p for p in audio_dir.iterdir() if p.suffix.lower() in (".mp3", ".wav", ".m4a")]
  if not files:
    raise FileNotFoundError("No audio files found in audio folder")
  files.sort(key=lambda p: p.stat().st_mtime)
  return str(files[-1])


def create_video(thumbnail_path, audio_path=None):
  if not thumbnail_path or not os.path.exists(thumbnail_path):
    raise FileNotFoundError(f"Thumbnail not found: {thumbnail_path}")

  audio_dir = BASE_DIR / "audio"
  if audio_path is None:
    audio_path = _pick_latest_audio(audio_dir)
  if not os.path.exists(audio_path):
    raise FileNotFoundError(f"Audio not found: {audio_path}")

  videos_dir = BASE_DIR / "videos"
  videos_dir.mkdir(parents=True, exist_ok=True)

  output = videos_dir / f"video_{int(time.time())}.mp4"

  cmd = [
    "ffmpeg",
    "-y",
    "-loop",
    "1",
    "-i",
    str(thumbnail_path),
    "-i",
    str(audio_path),
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

  _log(f"Rendering video with thumbnail: {thumbnail_path}")
  _log(f"Using audio: {audio_path}")
  subprocess.run(cmd, check=True)

  _log(f"Video ready: {output}")
  return str(output)
