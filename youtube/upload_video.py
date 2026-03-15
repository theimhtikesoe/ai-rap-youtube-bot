import os
from pathlib import Path

from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

BASE_DIR = Path(__file__).resolve().parents[1]
SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"]
CLIENT_SECRET = BASE_DIR / "client_secret.json"
TOKEN_PATH = BASE_DIR / "token.json"


def _log(msg):
  print(f"[youtube] {msg}")


def _get_credentials():
  creds = None
  if TOKEN_PATH.exists():
    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
  if not creds or not creds.valid:
    if creds and creds.expired and creds.refresh_token:
      creds.refresh(Request())
    else:
      flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET), SCOPES)
      creds = flow.run_local_server(port=0)
    TOKEN_PATH.write_text(creds.to_json())
  return creds


def upload_video(video_path, title, description, tags, thumbnail_path=None):
  if not os.path.exists(video_path):
    raise FileNotFoundError(f"Video not found: {video_path}")

  creds = _get_credentials()
  youtube = build("youtube", "v3", credentials=creds)

  body = {
    "snippet": {
      "title": title,
      "description": description,
      "tags": tags
    },
    "status": {
      "privacyStatus": "public"
    }
  }

  _log("Uploading video...")
  request = youtube.videos().insert(
    part="snippet,status",
    body=body,
    media_body=MediaFileUpload(video_path, chunksize=-1, resumable=True)
  )
  response = request.execute()
  video_id = response.get("id")

  _log(f"Upload complete: {video_id}")

  if thumbnail_path and os.path.exists(thumbnail_path):
    try:
      youtube.thumbnails().set(
        videoId=video_id,
        media_body=MediaFileUpload(thumbnail_path)
      ).execute()
      _log("Thumbnail set")
    except Exception as err:
      _log(f"Thumbnail upload failed: {err}")

  return video_id
