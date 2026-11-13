# Bundled Tesseract OCR (offline, on-device)

Used by `scan.html` through `src/page-ocr.js` so a page photo can be read without the internet.
Nothing here is loaded from a CDN at runtime; every file is served from the app itself and cached by `sw.js`.

- `tesseract.js@5.1.1` — `tesseract.min.js`, `worker.min.js`
- `tesseract.js-core@5.1.1` — `tesseract-core-simd-lstm.wasm.js` (WASM SIMD + LSTM; embedded, no separate .wasm fetch)
- `tessdata` 4.0.0_fast, LSTM — `eng.traineddata.gz`, `ben.traineddata.gz`

To refresh: re-download the exact same versions (see `scripts/fetch-ocr-assets.sh`).
Only devices with WebAssembly SIMD can run this (every modern Android WebView). Where it is missing,
`scan.html` says so and the student can type the text instead; the non-SIMD core can be added if a real phone needs it.
