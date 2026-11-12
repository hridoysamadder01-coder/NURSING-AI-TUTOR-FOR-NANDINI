#!/usr/bin/env bash
# Re-download the pinned, offline OCR assets into vendor/tesseract/. Run only to refresh versions.
set -euo pipefail
cd "$(dirname "$0")/.."
V=vendor/tesseract; mkdir -p "$V/tessdata"
base_npm=https://cdn.jsdelivr.net/npm
curl -fsSL "$base_npm/tesseract.js@5.1.1/dist/tesseract.min.js" -o "$V/tesseract.min.js"
curl -fsSL "$base_npm/tesseract.js@5.1.1/dist/worker.min.js" -o "$V/worker.min.js"
curl -fsSL "$base_npm/tesseract.js-core@5.1.1/tesseract-core-simd-lstm.wasm.js" -o "$V/tesseract-core-simd-lstm.wasm.js"
curl -fsSL "https://tessdata.projectnaptha.com/4.0.0_fast/eng.traineddata.gz" -o "$V/tessdata/eng.traineddata.gz"
curl -fsSL "https://tessdata.projectnaptha.com/4.0.0_fast/ben.traineddata.gz" -o "$V/tessdata/ben.traineddata.gz"
echo "OCR assets refreshed."
