# Nursing AI Tutor for Nandini

Mobile-first, Bengali-first study companion for Diploma in Nursing Science & Midwifery, Year 1, Bangladesh.

## Initial proof
The first release is a **functional offline-first study prototype**, not yet a clinical or AI-grounded textbook product. It includes reading links, study prompts, notes and a small clearly labelled illustrative self-assessment. A book-grounded AI tutor will only be enabled after licensed source content and retrieval/citation verification are available. Never claim answers are from a book without a verified page citation.

## Usage
Open `index.html` in a browser, or deploy this static repo to a HTTPS site for installable PWA support. No secrets or medical personal data should be entered. `manifest.webmanifest` and `sw.js` enable offline shell caching on HTTPS.

## Sources
- BNMC official curriculum must be checked against Nandini's college-required books/edition.
- Open RN Nursing Fundamentals: https://wtcs.pressbooks.pub/nursingfundamentals/
- Open RN Nursing Skills: https://wtcs.pressbooks.pub/nursingskills/
- Open RN Medical Terminology: https://wtcs.pressbooks.pub/medterm/

These are reading links only; no complete copyrighted textbook is bundled. Check individual license and asset conditions before ingesting any content.

## Test
Serve the repo over HTTP/HTTPS (e.g. `python -m http.server 8000`) and open browser. Check all tabs, 7 subject cards, note persistence, quiz marking, search, reader and small-phone viewport.

## Medical boundary
Education only. No diagnosis, patient-specific treatment, dosing, or unsupervised procedures.
