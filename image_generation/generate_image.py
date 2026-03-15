import json
import os
import time
import urllib.request
from pathlib import Path
import shutil
import subprocess

BASE_DIR = Path(__file__).resolve().parents[1]

COMFY_URL = os.getenv("COMFY_URL", "http://127.0.0.1:8188")
COMFY_OUTPUT = os.getenv("COMFY_OUTPUT", "/Users/rhyzoe/ComfyUI/output")
COMFY_TEMP = os.getenv("COMFY_TEMP", COMFY_OUTPUT.replace("/output", "/temp"))
COMFY_TIMEOUT_SEC = int(os.getenv("COMFY_TIMEOUT_SEC", "900"))
THUMB_WIDTH = int(os.getenv("THUMB_WIDTH", "1280"))
THUMB_HEIGHT = int(os.getenv("THUMB_HEIGHT", "720"))
THUMB_STEPS = int(os.getenv("THUMB_STEPS", "8"))
THUMB_CFG = float(os.getenv("THUMB_CFG", "3"))


def _log(msg):
  print(f"[image] {msg}")


def _request_json(url, payload=None):
  data = None
  headers = {"Content-Type": "application/json"}
  if payload is not None:
    data = json.dumps(payload).encode("utf-8")
  req = urllib.request.Request(url, data=data, headers=headers)
  with urllib.request.urlopen(req, timeout=120) as resp:
    return json.loads(resp.read().decode("utf-8"))


def _resolve_image_path(image):
  if not image or "filename" not in image:
    return None
  base = COMFY_TEMP if image.get("type") == "temp" else COMFY_OUTPUT
  sub = image.get("subfolder")
  if sub:
    return f"{base}/{sub}/{image['filename']}"
  return f"{base}/{image['filename']}"


def _pick_image(history_item):
  outputs = history_item.get("outputs", {})
  preferred = outputs.get("9", {}).get("images")
  if preferred:
    return preferred[0]
  for node in outputs.values():
    images = node.get("images")
    if images:
      return images[0]
  return None


def _wait_for_image(prompt_id):
  deadline = time.time() + COMFY_TIMEOUT_SEC
  interval = 2
  while time.time() < deadline:
    try:
      history = _request_json(f"{COMFY_URL}/history/{prompt_id}")
      item = history.get(prompt_id)
      if item and item.get("status", {}).get("status") == "error":
        raise RuntimeError(f"ComfyUI job failed for prompt {prompt_id}")
      image = _pick_image(item or {})
      path = _resolve_image_path(image)
      if path and os.path.exists(path):
        return path
    except Exception:
      pass
    time.sleep(interval)
    interval = min(10, int(interval * 1.25))
  raise TimeoutError("ComfyUI timed out waiting for image")


def generate_image(analysis):
  if not analysis or not analysis.get("visual_prompt"):
    raise ValueError("analysis.visual_prompt is required")

  prompt = analysis["visual_prompt"].strip()
  prompt = f\"{prompt}, no text, no logos, no watermark, no typography, no play button, no youtube icon\"

  _log("Generating image with ComfyUI")

  workflow_path = BASE_DIR / "image_z_image_turbo.json"
  workflow = json.loads(workflow_path.read_text())

  if "57:13" in workflow and "inputs" in workflow["57:13"]:
    workflow["57:13"]["inputs"]["width"] = THUMB_WIDTH
    workflow["57:13"]["inputs"]["height"] = THUMB_HEIGHT
  if "57:3" in workflow and "inputs" in workflow["57:3"]:
    workflow["57:3"]["inputs"]["steps"] = THUMB_STEPS
    workflow["57:3"]["inputs"]["cfg"] = THUMB_CFG
    workflow["57:3"]["inputs"]["seed"] = int(time.time() * 1000) % 1000000000
  if "57:27" in workflow and "inputs" in workflow["57:27"]:
    workflow["57:27"]["inputs"]["text"] = prompt

  res = _request_json(f"{COMFY_URL}/prompt", {"prompt": workflow})
  prompt_id = res.get("prompt_id")
  if not prompt_id:
    raise RuntimeError("ComfyUI /prompt response missing prompt_id")

  _log("Waiting for image render")
  img_path = _wait_for_image(prompt_id)

  thumbs_dir = BASE_DIR / "thumbnails"
  thumbs_dir.mkdir(parents=True, exist_ok=True)
  ts = int(time.time())
  out_file = thumbs_dir / f"thumb_{ts}.png"
  raw_file = thumbs_dir / f"raw_{ts}.png"

  shutil.copyfile(img_path, raw_file)

  cmd = [
    "ffmpeg",
    "-y",
    "-i",
    str(raw_file),
    "-vf",
    "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080",
    str(out_file)
  ]
  subprocess.run(cmd, check=True)

  _log(f"Thumbnail ready: {out_file}")
  return str(out_file)
