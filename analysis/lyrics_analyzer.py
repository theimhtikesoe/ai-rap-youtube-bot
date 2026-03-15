import json
import os
import re
import urllib.request

REQUIRED_KEYS = [
  "mood",
  "vibe",
  "theme",
  "keywords",
  "visual_prompt",
  "youtube_title",
  "youtube_description",
  "youtube_tags"
]


def _build_prompt(lyrics, style=None, requested_title=None):
  style_line = f"Preferred style: {style}" if style else "Preferred style: (auto)"
  title_line = f"Requested title: {requested_title}" if requested_title else "Requested title: (auto)"
  return f"""
Analyze the following rap lyrics and return JSON only with this exact schema:

{{
  \"mood\": \"\",
  \"vibe\": \"\",
  \"theme\": \"\",
  \"keywords\": [],
  \"visual_prompt\": \"\",
  \"youtube_title\": \"\",
  \"youtube_description\": \"\",
  \"youtube_tags\": []
}}

Guidelines:
- Identify emotional tone and hip hop subgenre.
- Extract a cinematic visual atmosphere.
- Keep it concise and coherent.
- Make the YouTube title and description unique to these lyrics.
- Include a short lyric hook inside the description.
- Respect the preferred style if provided.
- If a requested title is provided, adapt it but keep it unique to these lyrics.
- Output JSON only, no markdown or commentary.

{style_line}
{title_line}

Lyrics:
{lyrics}
""".strip()


def _call_ollama(prompt):
  url = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
  model = os.getenv("OLLAMA_MODEL", "llama3")
  payload = {
    "model": model,
    "messages": [{"role": "user", "content": prompt}],
    "stream": False
  }
  req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
  )
  with urllib.request.urlopen(req, timeout=120) as resp:
    data = json.loads(resp.read().decode("utf-8"))
  return data.get("message", {}).get("content", "")


def _call_openai(prompt):
  base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
  api_key = os.getenv("OPENAI_API_KEY")
  model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
  if not api_key:
    raise RuntimeError("OPENAI_API_KEY is not set")
  payload = {
    "model": model,
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.7
  }
  req = urllib.request.Request(
    f"{base}/chat/completions",
    data=json.dumps(payload).encode("utf-8"),
    headers={
      "Content-Type": "application/json",
      "Authorization": f"Bearer {api_key}"
    }
  )
  with urllib.request.urlopen(req, timeout=120) as resp:
    data = json.loads(resp.read().decode("utf-8"))
  return data["choices"][0]["message"]["content"]


def _extract_json(text):
  match = re.search(r"\{.*\}", text, re.DOTALL)
  if not match:
    raise ValueError("No JSON object found in model output")
  return json.loads(match.group(0))


def _ensure_list(value):
  if isinstance(value, list):
    return value
  if value is None:
    return []
  if isinstance(value, str):
    return [v.strip() for v in value.split(",") if v.strip()]
  return [str(value)]


def _fallback_result(lyrics, style=None, requested_title=None):
  lower = lyrics.lower()
  mood = "dark and introspective" if "night" in lower or "dark" in lower else "emotional"
  vibe = style if style else "underground rap"
  theme = "street life"
  keywords = ["rap", "underground", "night"]
  visual_prompt = "rapper walking in neon city at night, rain, cinematic lighting"
  title = requested_title if requested_title else "Dark Rap - Neon Night"
  description = "A dark underground rap about the streets and the night."
  tags = ["dark rap", "underground hip hop", "rap music"]
  return {
    "mood": mood,
    "vibe": vibe,
    "theme": theme,
    "keywords": keywords,
    "visual_prompt": visual_prompt,
    "youtube_title": title,
    "youtube_description": description,
    "youtube_tags": tags
  }


def _normalize(data, lyrics, style=None, requested_title=None):
  result = _fallback_result(lyrics, style, requested_title)
  if isinstance(data, dict):
    for key in REQUIRED_KEYS:
      if key in data and data[key] is not None:
        result[key] = data[key]
  result["keywords"] = _ensure_list(result.get("keywords"))
  result["youtube_tags"] = _ensure_list(result.get("youtube_tags"))
  result["mood"] = str(result.get("mood", "")).strip()
  result["vibe"] = str(result.get("vibe", "")).strip()
  result["theme"] = str(result.get("theme", "")).strip()
  result["visual_prompt"] = str(result.get("visual_prompt", "")).strip()
  result["youtube_title"] = str(result.get("youtube_title", "")).strip()
  result["youtube_description"] = str(result.get("youtube_description", "")).strip()
  return result


def analyze_lyrics(lyrics, style=None, requested_title=None):
  if not lyrics or not lyrics.strip():
    raise ValueError("Lyrics input is empty")
  prompt = _build_prompt(lyrics, style, requested_title)
  try:
    if os.getenv("OPENAI_API_KEY"):
      content = _call_openai(prompt)
    else:
      content = _call_ollama(prompt)
    data = _extract_json(content)
    return _normalize(data, lyrics, style, requested_title)
  except Exception:
    return _fallback_result(lyrics, style, requested_title)
