#!/usr/bin/env bash
# Upload a local images folder to Cloudflare R2 via the S3-compatible API.
#
# Prerequisites: AWS CLI v2 (brew install awscli)
#
# 1. Cloudflare → R2 → Overview → Account details → Manage (API Tokens)
# 2. Create token: Object Read & Write (optionally scoped to your bucket)
# 3. Copy Account ID from the same Overview page
#
# Usage (set secrets in the shell — never paste them into this file):
#   export R2_ACCOUNT_ID="your_account_id"
#   export R2_ACCESS_KEY_ID="..."
#   export R2_SECRET_ACCESS_KEY="..."
#   export R2_BUCKET="clinical-annotation-tool"
#   export R2_PREFIX="Images"
#   export LOCAL_DIR="/path/to/images"
#   ./scripts/upload-images-to-r2.sh
#
# Dry run (list what would upload):
#   DRY_RUN=1 ./scripts/upload-images-to-r2.sh
#
# Re-upload only filenames listed one per line (e.g. /tmp/r2-upload-failed.txt):
#   FAILED_LIST=/tmp/r2-upload-failed.txt ./scripts/upload-images-to-r2.sh

set -euo pipefail

: "${R2_ACCOUNT_ID:?Set R2_ACCOUNT_ID}"
: "${R2_ACCESS_KEY_ID:?Set R2_ACCESS_KEY_ID}"
: "${R2_SECRET_ACCESS_KEY:?Set R2_SECRET_ACCESS_KEY}"
: "${R2_BUCKET:?Set R2_BUCKET}"
: "${LOCAL_DIR:?Set LOCAL_DIR to your local images folder}"

R2_PREFIX="${R2_PREFIX:-Multimodal images}"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

if [[ ! -d "$LOCAL_DIR" ]]; then
  echo "Local directory not found: $LOCAL_DIR" >&2
  exit 1
fi

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

DEST="s3://${R2_BUCKET}/${R2_PREFIX}/"

if [[ -n "${FAILED_LIST:-}" ]]; then
  if [[ ! -f "$FAILED_LIST" ]]; then
    echo "FAILED_LIST not found: $FAILED_LIST" >&2
    exit 1
  fi
  echo "Re-uploading files from: $FAILED_LIST"
  echo "Destination: $DEST"
  while IFS= read -r f || [[ -n "$f" ]]; do
    f="${f//$'\r'/}"
    [[ -z "$f" ]] && continue
    # Ignore corrupted lines (e.g. terminal prompts pasted into FAILED_LIST)
    [[ "$f" =~ ^[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$ ]] || {
      echo "Skip (not a filename): $f" >&2
      continue
    }
    src="${LOCAL_DIR%/}/$f"
    if [[ ! -f "$src" ]]; then
      echo "Skip (missing locally): $f" >&2
      continue
    fi
    echo "Uploading $f ..."
    if [[ -n "${DRY_RUN:-}" ]]; then
      aws s3 cp "$src" "${DEST}${f}" --endpoint-url "$ENDPOINT" --dryrun
    else
      aws s3 cp "$src" "${DEST}${f}" --endpoint-url "$ENDPOINT"
    fi
  done < "$FAILED_LIST"
  echo ""
  echo "Done (failed-list mode)."
  exit 0
fi

echo "Syncing from: $LOCAL_DIR"
echo "Syncing to:   $DEST (via $ENDPOINT)"
echo ""

if [[ -n "${DRY_RUN:-}" ]]; then
  aws s3 sync "$LOCAL_DIR" "$DEST" --endpoint-url "$ENDPOINT" --dryrun
else
  aws s3 sync "$LOCAL_DIR" "$DEST" --endpoint-url "$ENDPOINT"
fi

echo ""
echo "Done. Test one object in the browser, e.g.:"
echo "  https://pub-XXXX.r2.dev/${R2_PREFIX// /%20}/<filename>.jpg"
