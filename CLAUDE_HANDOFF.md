# Handoff for Claude

Read in this order: `CLAUDE.md` (rules, including when to ask the owner for a new session), `STATUS.md` (what is done and
what is still unverified), `TOMORROW.md` (next steps). Feature details are in `README.md`, the Android build in `ANDROID.md`.

Older paths that are still optional, not current work: deploying `server.mjs` with Ollama on the owner's VPS
(`DEPLOYMENT.md`, `LOCAL_AI.md`). Inspect a VPS read-only first, never disturb other services, and buy nothing.

Bookshelf since 12 Nov 2026 (issue #2): 12 bundled books, 2,676 text chapters. Besides the four Open RN books there are seven
OpenStax books (CC BY-NC-SA 4.0; the publisher forbids AI use, so they are reading and search only) and the NCI SEER anatomy
overview (text free of copyright; the Tutor's AI may use it). `data/books/shelf.json` records the six photographed Neuron titles
(owned on paper, no text in the app), the unconfirmed ICT title, the subject mapping and the AI decision for every book.
No Neuron text may be copied into the repository or the APK.

Book facts that stay true: the four Open RN books (632 chapters, CC BY 4.0, WisTech Open) are imported automatically by
`scripts/import_openrn.py`; images and media are stripped; nine chapters link to the book homepage; PDF page numbers are not
verified. They are international reference books, not Nandini's college-prescribed books.
