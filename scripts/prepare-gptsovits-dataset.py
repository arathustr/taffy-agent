from __future__ import annotations

import argparse
import json
import re
import shutil
import wave
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path


@dataclass
class ListEntry:
    line_index: int
    source_path: str
    source_basename: str
    speaker: str
    language: str
    text: str
    number: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare a GPT-SoVITS dataset from Taffy wav/text annotations.")
    parser.add_argument("--list", default="vedio/taffy.list", help="Input annotation list.")
    parser.add_argument("--zip", default="vedio/taffy.zip", help="Input wav zip.")
    parser.add_argument("--out", default=".taffy/voice/gptsovits/Taffy", help="Output dataset directory.")
    parser.add_argument("--speaker", default="Taffy", help="Speaker name written to the output filelist.")
    return parser.parse_args()


def parse_list(path: Path) -> list[ListEntry]:
    entries: list[ListEntry] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), start=1):
        if not line.strip():
            continue
        parts = line.split("|", 3)
        if len(parts) != 4:
            raise ValueError(f"Bad annotation line {line_number}: {line}")
        match = re.search(r"(\d+)(?=\.wav$)", parts[0], re.IGNORECASE)
        if not match:
            raise ValueError(f"Cannot read wav number on line {line_number}: {parts[0]}")
        entries.append(
            ListEntry(
                line_number,
                parts[0],
                Path(parts[0]).name,
                parts[1] or "Taffy",
                parts[2] or "ZH",
                parts[3].strip(),
                int(match.group(1)),
            )
        )
    return entries


def index_zip_wavs(path: Path) -> tuple[dict[str, zipfile.ZipInfo], dict[int, list[zipfile.ZipInfo]]]:
    by_basename: dict[str, zipfile.ZipInfo] = {}
    by_number: dict[int, list[zipfile.ZipInfo]] = {}
    with zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            if not info.filename.lower().endswith(".wav"):
                continue
            basename = Path(info.filename).name.lower()
            by_basename[basename] = info
            match = re.search(r"_(\d+)(?=\.wav$)", info.filename, re.IGNORECASE)
            if not match:
                continue
            number = int(match.group(1))
            by_number.setdefault(number, []).append(info)
    return by_basename, by_number


def wav_duration_seconds(data: bytes) -> tuple[float, int, int, int]:
    with wave.open(BytesIO(data), "rb") as wav:
        sample_rate = wav.getframerate()
        frames = wav.getnframes()
        channels = wav.getnchannels()
        sample_width = wav.getsampwidth()
        return frames / sample_rate, sample_rate, channels, sample_width


def main() -> None:
    args = parse_args()
    list_path = Path(args.list)
    zip_path = Path(args.zip)
    out_dir = Path(args.out)
    audio_dir = out_dir / "audios" / "raw"
    filelist_path = out_dir / "taffy-gptsovits.list"
    report_path = out_dir / "prepare-report.json"
    references_path = out_dir / "reference-candidates.list"

    if not list_path.exists():
        raise FileNotFoundError(list_path)
    if not zip_path.exists():
        raise FileNotFoundError(zip_path)

    entries = parse_list(list_path)
    by_basename, by_number = index_zip_wavs(zip_path)
    missing = [
        entry.source_path
        for entry in entries
        if entry.source_basename.lower() not in by_basename and entry.number not in by_number
    ]
    if missing:
        raise FileNotFoundError(f"Missing wav ids in zip: {missing[:20]}")

    if out_dir.exists():
        shutil.rmtree(out_dir)
    audio_dir.mkdir(parents=True, exist_ok=True)

    prepared: list[dict[str, object]] = []
    filelist_lines: list[str] = []
    with zipfile.ZipFile(zip_path) as archive:
        for entry in entries:
            info = by_basename.get(entry.source_basename.lower())
            if info is None:
                info = sorted(by_number[entry.number], key=lambda item: item.file_size, reverse=True)[0]
            data = archive.read(info)
            duration, sample_rate, channels, sample_width = wav_duration_seconds(data)
            safe_basename = re.sub(r"[^A-Za-z0-9_.~-]+", "_", entry.source_basename)
            target = audio_dir / f"{entry.line_index:04d}_{safe_basename}"
            target.write_bytes(data)
            normalized_path = target.as_posix()
            filelist_lines.append(f"{normalized_path}|{args.speaker}|{entry.language}|{entry.text}")
            prepared.append(
                {
                    "id": entry.number,
                    "source": info.filename,
                    "target": normalized_path,
                    "durationSec": round(duration, 3),
                    "sampleRate": sample_rate,
                    "channels": channels,
                    "sampleWidthBytes": sample_width,
                    "text": entry.text,
                }
            )

    filelist_path.write_text("\n".join(filelist_lines) + "\n", encoding="utf-8")

    reference_candidates = [
        item
        for item in prepared
        if 3.0 <= float(item["durationSec"]) <= 8.0 and 8 <= len(str(item["text"])) <= 45
    ]
    reference_candidates.sort(key=lambda item: (abs(float(item["durationSec"]) - 5.5), len(str(item["text"]))))
    references_path.write_text(
        "\n".join(f'{item["target"]}|{item["text"]}|{item["durationSec"]}s' for item in reference_candidates[:30]) + "\n",
        encoding="utf-8",
    )

    report = {
        "speaker": args.speaker,
        "items": len(prepared),
        "totalMinutes": round(sum(float(item["durationSec"]) for item in prepared) / 60, 2),
        "filelist": filelist_path.as_posix(),
        "audioDir": audio_dir.as_posix(),
        "referenceCandidates": references_path.as_posix(),
        "sampleRates": sorted({item["sampleRate"] for item in prepared}),
        "channels": sorted({item["channels"] for item in prepared}),
        "sourceList": list_path.as_posix(),
        "sourceZip": zip_path.as_posix(),
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
