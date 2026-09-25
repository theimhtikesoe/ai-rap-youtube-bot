#!/usr/bin/env python3
"""Validate an Applio voice dataset before GPU training.

This script performs lightweight, dependency-free checks. It does not modify audio.
"""

from __future__ import annotations

import argparse
import wave
from pathlib import Path

SUPPORTED = {".wav", ".flac"}
OPTIONAL = {".mp3", ".m4a", ".ogg"}


def wav_info(path: Path) -> tuple[float, int, int] | None:
    try:
        with wave.open(str(path), "rb") as handle:
            frames = handle.getnframes()
            rate = handle.getframerate()
            channels = handle.getnchannels()
            if rate <= 0:
                return None
            return frames / rate, rate, channels
    except (wave.Error, OSError):
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, required=True)
    args = parser.parse_args()

    root = args.dataset.expanduser().resolve()
    if not root.is_dir():
        print(f"ERROR: dataset directory does not exist: {root}")
        return 2

    files = sorted(path for path in root.rglob("*") if path.is_file())
    audio = [path for path in files if path.suffix.lower() in SUPPORTED | OPTIONAL]
    unsupported = [path for path in files if path.suffix.lower() not in SUPPORTED | OPTIONAL]

    if not audio:
        print("ERROR: no audio files found. Prefer .wav or .flac files.")
        return 2

    total_seconds = 0.0
    wav_count = 0
    unreadable_wav = []
    sample_rates: dict[int, int] = {}
    channels: dict[int, int] = {}

    for path in audio:
        info = wav_info(path) if path.suffix.lower() == ".wav" else None
        if path.suffix.lower() == ".wav":
            wav_count += 1
            if info is None:
                unreadable_wav.append(path)
                continue
            duration, rate, channel_count = info
            total_seconds += duration
            sample_rates[rate] = sample_rates.get(rate, 0) + 1
            channels[channel_count] = channels.get(channel_count, 0) + 1

    print(f"Dataset: {root}")
    print(f"Audio files: {len(audio)}")
    print(f"Lossless files (.wav/.flac): {sum(p.suffix.lower() in SUPPORTED for p in audio)}")
    print(f"Optional compressed files (.mp3/.m4a/.ogg): {sum(p.suffix.lower() in OPTIONAL for p in audio)}")
    if wav_count:
        print(f"Readable WAV duration: {total_seconds / 60:.2f} minutes")
        print(f"WAV sample rates: {sample_rates}")
        print(f"WAV channel counts: {channels}")
    if unsupported:
        print(f"WARNING: ignored non-audio files: {len(unsupported)}")
    if unreadable_wav:
        print(f"ERROR: unreadable WAV files: {len(unreadable_wav)}")
        for path in unreadable_wav[:10]:
            print(f"  - {path.relative_to(root)}")
        return 1

    if sum(p.suffix.lower() in SUPPORTED for p in audio) == 0:
        print("WARNING: no .wav or .flac files found; convert compressed audio before training.")
    if total_seconds and total_seconds < 10 * 60:
        print("WARNING: readable WAV duration is below the recommended 10 minutes.")
    elif total_seconds >= 10 * 60:
        print("OK: readable WAV duration meets the 10-minute minimum guideline.")

    print("Validation complete. Review warnings before starting Applio training.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

