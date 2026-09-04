#!/usr/bin/env python3
"""Render ready-media audits or a selected non-publishing discovery report."""

from __future__ import annotations

import argparse
import io
import json
import textwrap
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts" / "media-review"
PUBLIC_AUDIT = ROOT / "public" / "media-render-audit.json"
LOCKED_MEDIA_COUNTS = {"04": 100, "05": 100}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def expected_media_count(batch: str) -> int:
    locked = LOCKED_MEDIA_COUNTS.get(batch)
    if locked is not None:
        return locked

    manifest = read_json(ROOT / "data" / "batches" / f"batch-{batch}.json")
    items = manifest.get("items") or []
    if batch == "06" and len(items) != 175:
        raise RuntimeError(f"Batch 06 expected 175 manifest rows; found {len(items)}")
    return sum(item.get("status") == "ready" for item in items)


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    names = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for name in names:
        try:
            return ImageFont.truetype(name, size=size)
        except OSError:
            pass
    return ImageFont.load_default()


def fetch_image(url: str) -> Image.Image:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "PLU-contact-sheet-audit/1.0 (+https://plu-beta.vercel.app/)",
            "Accept": "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
        },
    )
    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                payload = response.read()
            with Image.open(io.BytesIO(payload)) as image:
                decoded = ImageOps.exif_transpose(image).convert("RGB")
                decoded.load()
                return decoded
        except (OSError, urllib.error.HTTPError, urllib.error.URLError) as error:
            last_error = error
            time.sleep(attempt * 1.5)
    raise RuntimeError(f"Image download/decode failed: {last_error}")


def draw_cell(canvas: Image.Image, item: dict[str, Any], image: Image.Image, box: tuple[int, int, int, int]) -> None:
    draw = ImageDraw.Draw(canvas)
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill="white", outline=(224, 224, 224), width=1)
    visual = ImageOps.contain(image, (x1 - x0 - 20, 150), Image.Resampling.LANCZOS)
    canvas.paste(visual, (x0 + (x1 - x0 - visual.width) // 2, y0 + 10 + (150 - visual.height) // 2))
    title = f"{int(item['order']):03d} · {item['title']}"
    file_name = str(item["file"])
    draw.multiline_text(
        (x0 + 10, y0 + 168),
        "\n".join(textwrap.wrap(title, 32)[:2]),
        fill=(20, 20, 20),
        font=font(13, bold=True),
        spacing=2,
    )
    draw.multiline_text(
        (x0 + 10, y0 + 207),
        "\n".join(textwrap.wrap(file_name, 40)[:2]),
        fill=(92, 92, 92),
        font=font(10),
        spacing=2,
    )


def draw_discovery_cell(
    canvas: Image.Image,
    item: dict[str, Any],
    image: Image.Image,
    box: tuple[int, int, int, int],
) -> None:
    draw = ImageDraw.Draw(canvas)
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill="white", outline=(224, 224, 224), width=1)
    visual = ImageOps.contain(image, (x1 - x0 - 20, 165), Image.Resampling.LANCZOS)
    canvas.paste(
        visual,
        (x0 + (x1 - x0 - visual.width) // 2, y0 + 10 + (165 - visual.height) // 2),
    )

    order = int(item["candidateOrder"])
    variant = str(item["variant"])
    heading = f"{order:03d} · {item['catalogId']} · {variant}"
    draw.multiline_text(
        (x0 + 10, y0 + 184),
        "\n".join(textwrap.wrap(heading, 43)[:2]),
        fill=(20, 20, 20),
        font=font(12, bold=True),
        spacing=2,
    )
    draw.multiline_text(
        (x0 + 10, y0 + 218),
        "\n".join(textwrap.wrap(str(item["title"]), 43)[:2]),
        fill=(34, 34, 34),
        font=font(11, bold=True),
        spacing=2,
    )
    draw.multiline_text(
        (x0 + 10, y0 + 250),
        "\n".join(textwrap.wrap(str(item["file"]), 51)[:2]),
        fill=(92, 92, 92),
        font=font(9),
        spacing=2,
    )
    draw.multiline_text(
        (x0 + 10, y0 + 282),
        "\n".join(textwrap.wrap(f"match: {item['match']}", 51)[:2]),
        fill=(67, 91, 75),
        font=font(9, bold=True),
        spacing=2,
    )


def build_batch(batch: str) -> dict[str, Any]:
    report = read_json(ROOT / "public" / f"media-resolution-batch{batch}.json")
    media = report.get("media") or []
    expected = expected_media_count(batch)
    if len(media) != expected:
        raise RuntimeError(
            f"Batch {batch} expected {expected} ready media records; found {len(media)}"
        )

    decoded: list[tuple[dict[str, Any], Image.Image]] = []
    failures: list[dict[str, str]] = []
    batch_dir = OUTPUT / f"batch-{batch}"
    thumbs = batch_dir / "thumbnails"
    sheets = batch_dir / "contact-sheets"
    thumbs.mkdir(parents=True, exist_ok=True)
    sheets.mkdir(parents=True, exist_ok=True)

    for item in media:
        try:
            image = fetch_image(str(item["src"]))
            image.thumbnail((720, 720), Image.Resampling.LANCZOS)
            thumb_path = thumbs / f"{int(item['order']):03d}.jpg"
            image.save(thumb_path, "JPEG", quality=88, optimize=True)
            decoded.append((item, image.copy()))
        except RuntimeError as error:
            failures.append({"title": str(item.get("title")), "src": str(item.get("src")), "error": str(error)})
        if int(item["order"]) % 10 == 0:
            print(f"Decoded Batch {batch} images {item['order']}/{len(media)}")

    if failures:
        raise RuntimeError(f"Batch {batch} has {len(failures)} image download/decode failures: {failures[:3]}")

    columns, rows = 5, 4
    cell_w, cell_h = 300, 260
    page_size = columns * rows
    for start in range(0, len(decoded), page_size):
        page = Image.new("RGB", (columns * cell_w, rows * cell_h), (246, 246, 244))
        for index, (item, image) in enumerate(decoded[start:start + page_size]):
            column = index % columns
            row = index // columns
            draw_cell(
                page,
                item,
                image,
                (column * cell_w, row * cell_h, (column + 1) * cell_w - 1, (row + 1) * cell_h - 1),
            )
        page.save(sheets / f"page-{start // page_size + 1:02d}.jpg", "JPEG", quality=90, optimize=True)

    return {
        "batch": batch,
        "media": len(media),
        "decoded": len(decoded),
        "contactSheets": (len(decoded) + page_size - 1) // page_size,
        "failures": failures,
    }


def discovery_candidates(report: dict[str, Any]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    media = report.get("media") or []
    if not isinstance(media, list):
        raise RuntimeError("Discovery report 'media' must be an array.")

    for index, item in enumerate(media, start=1):
        candidate_order = item.get("candidateOrder", index)
        parent_match = str(item.get("match") or "unspecified")
        primary = {
            "candidateOrder": candidate_order,
            "catalogId": item.get("catalogId") or "unknown-catalog-id",
            "title": item.get("title") or "Untitled candidate",
            "file": item.get("file") or "unknown-file",
            "src": item.get("src"),
            "match": parent_match,
            "variant": "primary",
        }
        candidates.append(primary)

        alternatives = item.get("alternatives") or []
        if not isinstance(alternatives, list):
            raise RuntimeError(
                f"Discovery alternatives for {primary['catalogId']} must be an array."
            )
        for alternative_index, alternative in enumerate(alternatives, start=1):
            candidates.append(
                {
                    "candidateOrder": candidate_order,
                    "catalogId": primary["catalogId"],
                    "title": primary["title"],
                    "file": alternative.get("file") or "unknown-file",
                    "src": alternative.get("src"),
                    "match": alternative.get("match") or f"alternative to {parent_match}",
                    "variant": f"alternative {alternative_index}",
                }
            )

    missing_sources = [item for item in candidates if not item.get("src")]
    if missing_sources:
        first = missing_sources[0]
        raise RuntimeError(
            "Discovery candidate is missing an image source: "
            f"{first['catalogId']} / {first['file']}"
        )
    return candidates


def build_discovery_report(report_path: Path) -> dict[str, Any]:
    report = read_json(report_path)
    if not isinstance(report, dict):
        raise RuntimeError("Discovery report must contain a JSON object.")

    candidates = discovery_candidates(report)
    report_dir = OUTPUT / report_path.stem
    thumbs = report_dir / "thumbnails"
    sheets = report_dir / "contact-sheets"
    thumbs.mkdir(parents=True, exist_ok=True)
    sheets.mkdir(parents=True, exist_ok=True)

    decoded: list[tuple[dict[str, Any], Image.Image]] = []
    failures: list[dict[str, str]] = []
    for index, item in enumerate(candidates, start=1):
        try:
            image = fetch_image(str(item["src"]))
            image.thumbnail((720, 720), Image.Resampling.LANCZOS)
            thumb_path = thumbs / f"{index:03d}.jpg"
            image.save(thumb_path, "JPEG", quality=88, optimize=True)
            decoded.append((item, image.copy()))
        except RuntimeError as error:
            failures.append(
                {
                    "catalogId": str(item["catalogId"]),
                    "file": str(item["file"]),
                    "src": str(item["src"]),
                    "error": str(error),
                }
            )
        if index % 10 == 0 or index == len(candidates):
            print(f"Decoded discovery images {index}/{len(candidates)}")

    if failures:
        raise RuntimeError(
            f"Discovery report has {len(failures)} image download/decode failures: "
            f"{failures[:3]}"
        )

    columns, rows = 4, 3
    cell_w, cell_h = 360, 320
    page_size = columns * rows
    for start in range(0, len(decoded), page_size):
        page = Image.new("RGB", (columns * cell_w, rows * cell_h), (246, 246, 244))
        for index, (item, image) in enumerate(decoded[start:start + page_size]):
            column = index % columns
            row = index // columns
            draw_discovery_cell(
                page,
                item,
                image,
                (column * cell_w, row * cell_h, (column + 1) * cell_w - 1, (row + 1) * cell_h - 1),
            )
        page.save(
            sheets / f"page-{start // page_size + 1:02d}.jpg",
            "JPEG",
            quality=90,
            optimize=True,
        )

    summary = {
        "mode": "discovery",
        "report": str(report_path),
        "batch": report.get("batch"),
        "resolvedRecords": len(report.get("media") or []),
        "renderedCandidates": len(candidates),
        "decoded": len(decoded),
        "contactSheets": (len(decoded) + page_size - 1) // page_size,
        "failures": failures,
        "publishingDataChanged": False,
    }
    (report_dir / "summary.json").write_text(
        json.dumps(summary, indent=2) + "\n",
        encoding="utf-8",
    )
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Render the default Batch 04–06 ready-media audit, or select a "
            "non-publishing media discovery report."
        )
    )
    parser.add_argument(
        "--report",
        type=Path,
        help=(
            "Discovery JSON report to render (for example "
            "public/media-discovery-batch06.json). Relative paths resolve from the repo root."
        ),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if args.report:
        report_path = args.report.expanduser()
        if not report_path.is_absolute():
            report_path = ROOT / report_path
        if not report_path.is_file():
            raise RuntimeError(f"Discovery report does not exist: {report_path}")
        summary = build_discovery_report(report_path.resolve())
        print(json.dumps(summary, indent=2))
        return

    summary = {"batches": [build_batch("04"), build_batch("05"), build_batch("06")]}
    (OUTPUT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    PUBLIC_AUDIT.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
