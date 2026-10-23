# LAST MILE FOR CLAUDE (October 23, 2026)

**Don't rebuild, research or manually upload textbooks. Save weekly tokens.**

GitHub: `hridoysamadder01-coder/NURSING-AI-TUTOR-FOR-NANDINI` (private).
Owner wants **real Android access for Nandini**, a first-year Bangladesh Diploma Nursing student. Claimed existing authorized PC/VPS access. The remote Desktop Commander connected through ChatGPT was quota-blocked; Claude's own access may work.

## Already built and verified by ChatGPT
- Mobile Bengali PWA frontend: home, 7 subjects (verify against college), notes, MCQ, PDF local reader, chapter tutor.
- **All three official Open RN publisher books pulled automatically by GitHub Actions using the lightweight publisher XML/XHTML exports**. Book data on main under `data/books/`:
  - `fundamentals.json`: 141 extracted source chapters
  - `skills.json`: 214 extracted source chapters
  - `terminology.json`: 148 extracted source chapters
  - total **503** text-only chapters with headings and source metadata.
- `library.html` has in-app reading/search, publisher PDF buttons, and a guarded optional Bengali AI feature.
- `scripts/import_openrn.py` reimports source books, preserving links. No separate Nandini file upload required for those three books.
- Source license: WisTech Open, CC BY 4.0 except where otherwise noted. Imported output strips embedded images/media, footnote media and layouts, and attributes transformation. Nine chapters lacked exact matching URLs, so their source link falls back to the book homepage. Do NOT claim verified PDF page numbers.
- `server.mjs` supports **local Ollama** (`NANDINI_AI_PROVIDER=ollama`, `OLLAMA_MODEL=qwen3:1.7b` and private `NANDINI_STUDENT_CODE`) without OpenAI API. Fixed loopback backend, bounded 2 CPU threads, max 1 concurrent local generation. Current GitHub CI tests cover the adapter; actual model quality/RAM/latency remains UNTESTED.
- GitHub Actions checks the source integrity, browser JS syntax, and server routes. CHECK latest workflow status before reporting.

## ONLY engineering remaining (few steps)
1. Run `npm test`, inspect the latest GitHub Action and smoke-test library.html on actual Chrome. Fix only real defects.
2. With existing authorized VPS/PC access, inspect current production services first and **deploy separately** on mama-core-01 over HTTPS. Do not disturb existing apps. Follow DEPLOYMENT.md.
3. **Prefer FREE local AI first.** Read `LOCAL_AI.md`, inspect VPS free RAM and running critical services BEFORE attempting Ollama. Test qwen3:1.7b on the same host only if spare memory and isolation make it safe. Check Bengali nursing quality and citation truth against chapters. If insufficient RAM or quality, STOP and report; do not buy paid API or disrupt other apps.
4. Have owner/Nandini install PWA on Android and verify 1 book chapter, English/Bengali term search, MCQ and notes.
5. Report working URL, exact tested commit, actual passes/failures and only true blockers. STOP.

IMPORTANT: The imported textbooks are **international reference books**, not Nandini's actual seven Bangladeshi college-prescribed textbooks. Do not silently claim otherwise. Any college-specific textbook requires its legal source/edition and consent. No patient-specific prescriptions or invasive procedure guidance.

Do not ask Hridoy to manually upload any of the three Open RN books. No Vercel, no paid API, no new server purchase without owner's explicit approval. Keep Claude token spend minimal.

## Updated owner-first path (no Claude required yet)

ChatGPT added `coach.html` (seven subjects, 41 tasks, spaced revision), four source-linked Open RN reference books (**632 chapters**), server-side trusted-evidence retrieval, opt-in localhost Ollama path, and GitHub Actions Android APK build. Real mobile-browser E2E passed. `settings.html` lets APK store future HTTPS AI server URL; no provider API key needed for Ollama. See `ANDROID.md`, `LOCAL_AI.md`, and latest Actions runs. If Claude is ever used, ONLY inspect VPS read-only first, safely deploy the prebuilt service, and verify real AI/Android usage. Avoid reimplementing, buying APIs or touching unrelated VPS workloads.
