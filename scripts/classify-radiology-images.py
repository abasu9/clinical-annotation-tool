#!/usr/bin/env python3
"""Classify local dataset images as radiology vs non-radiology using CLIP zero-shot."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image
import torch
from transformers import CLIPModel, CLIPProcessor

RADIOLOGY_LABELS = [
    "chest x-ray radiograph",
    "bone or joint x-ray radiograph",
    "dental x-ray radiograph",
    "CT scan medical imaging",
    "MRI scan medical imaging",
    "ultrasound sonogram medical imaging",
    "mammogram breast imaging",
    "PET scan nuclear medicine imaging",
]

NON_RADIOLOGY_LABELS = [
    "clinical photograph of skin rash wound or lesion",
    "smartphone photo of body part or symptom",
    "photo of blood test lab report or medical document",
    "photo of pills medication or prescription bottle",
    "photo of stool urine or bodily fluid sample",
]

ALL_LABELS = RADIOLOGY_LABELS + NON_RADIOLOGY_LABELS
RAD_IDX = set(range(len(RADIOLOGY_LABELS)))


def load_model(device: str):
    model_name = "openai/clip-vit-base-patch32"
    processor = CLIPProcessor.from_pretrained(model_name)
    model = CLIPModel.from_pretrained(model_name).to(device)
    model.eval()
    return processor, model


@torch.inference_mode()
def classify_image(path: Path, processor, model, device: str) -> tuple[bool, str, float]:
    image = Image.open(path).convert("RGB")
    inputs = processor(text=ALL_LABELS, images=image, return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    outputs = model(**inputs)
    probs = outputs.logits_per_image.softmax(dim=1)[0].cpu()

    rad_score = max(float(probs[i]) for i in RAD_IDX)
    non_rad_score = max(float(probs[i]) for i in range(len(RADIOLOGY_LABELS), len(ALL_LABELS)))
    best_idx = int(probs.argmax())
    best_label = ALL_LABELS[best_idx]
    is_radiology = best_idx in RAD_IDX and rad_score >= non_rad_score
    confidence = float(probs[best_idx])
    return is_radiology, best_label, confidence


def iter_images(images_dir: Path) -> list[Path]:
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    files = [p for p in images_dir.iterdir() if p.suffix.lower() in exts]
    return sorted(files, key=lambda p: p.name)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--images",
        default="/Users/abhishekbasu/Documents/JOB/MultimodalQsumm/images",
        help="Folder with downloaded images",
    )
    parser.add_argument(
        "--jsonl",
        default="/Users/abhishekbasu/Desktop/Interface/clinical-annotation-tool/Dataset/arctic_data.prepared.jsonl",
        help="Prepared JSONL to map post_id image counts",
    )
    parser.add_argument("--limit", type=int, default=0, help="Only classify first N images (0 = all)")
    parser.add_argument("--output", default="", help="Optional JSON output path")
    args = parser.parse_args()

    images_dir = Path(args.images)
    if not images_dir.exists():
        raise SystemExit(f"Images dir not found: {images_dir}")

    device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Device: {device}")

    processor, model = load_model(device)
    files = iter_images(images_dir)
    if args.limit:
        files = files[: args.limit]

    results = []
    rad_count = 0
    for i, path in enumerate(files, 1):
        try:
            is_rad, label, conf = classify_image(path, processor, model, device)
        except Exception as e:  # noqa: BLE001
            results.append({"file": path.name, "error": str(e)})
            continue
        if is_rad:
            rad_count += 1
        results.append(
            {
                "file": path.name,
                "radiology": is_rad,
                "label": label,
                "confidence": round(conf, 4),
            }
        )
        if i % 25 == 0 or i == len(files):
            print(f"Processed {i}/{len(files)} · radiology so far: {rad_count}")

    posts_with_rad = set()
    posts_total = set()
    if Path(args.jsonl).exists():
        with Path(args.jsonl).open() as f:
            for line in f:
                if not line.strip():
                    continue
                row = json.loads(line)
                post_id = row["post_id"]
                posts_total.add(post_id)
                for url in row.get("image_urls", []):
                    fname = Path(url.split("/")[-1]).name.replace("%20", " ")
                    match = next((r for r in results if r.get("file") == fname), None)
                    if match and match.get("radiology"):
                        posts_with_rad.add(post_id)

    print("\n=== Image-level (CLIP zero-shot) ===")
    print(f"Total images classified: {len(results)}")
    print(f"Radiology images: {rad_count}")
    print(f"Non-radiology images: {len(results) - rad_count}")
    if posts_total:
        print("\n=== Post-level (any radiology image in post) ===")
        print(f"Posts in prepared JSONL: {len(posts_total)}")
        print(f"Posts with >=1 radiology image (matched files): {len(posts_with_rad)}")

    label_counts: dict[str, int] = {}
    for r in results:
        if r.get("radiology"):
            label_counts[r["label"]] = label_counts.get(r["label"], 0) + 1
    if label_counts:
        print("\nRadiology label breakdown:")
        for k, v in sorted(label_counts.items(), key=lambda x: -x[1]):
            print(f"  {v:4d}  {k}")

    if args.output:
        out = {
            "total_images": len(results),
            "radiology_images": rad_count,
            "non_radiology_images": len(results) - rad_count,
            "results": results,
        }
        Path(args.output).write_text(json.dumps(out, indent=2))
        print(f"\nWrote {args.output}")


if __name__ == "__main__":
    main()
