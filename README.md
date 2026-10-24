# Nursing AI Tutor for Nandini 🌿

**Owner:** Hridoy · **Learner:** Nandini, Bangladesh Diploma in Nursing Science & Midwifery, Year 1.

**Status: verifiable early study app, NOT yet a complete nursing AI tutor.** GitHub Actions validates evidence search, MCQ integrity and server routes. Real Android/PWA field testing and live AI service remain unverified.

## What works in code

- `index.html`: Bengali-friendly mobile home, 7 first-year course placeholders, student-uploaded PDF reader, sample general MCQs, local personal notes.
- `tutor.html`: one **real Open RN Nursing Fundamentals 2e** chapter (9.6 Preventing Infection), 6 Bengali explanation sections with precise **chapter/subheading links**, five chapter-based MCQs with explanations, and question-to-lesson retrieval.
- User PDFs: local, client-side PDF.js text extraction (first 100 pages, max 20MB); relevant **actual PDF page numbers** and verbatim excerpts, NOT fabricated page citations or generated translations. Scanned-image-only PDFs require OCR, which is not yet built.
- `server.mjs`: dependency-free HTTPS-reverse-proxy-ready Node backend with optional authenticated **local Ollama** (no paid API) or OpenAI Responses API. When configured, can provide Bengali explanations from up to four submitted cited passages. Citations are checked for valid passage IDs, but citation validity does not itself prove every factual claim correct. Student must check the original material.
- PWA shell cache; notes and quiz sessions stored locally.
- `npm test`: source-match refusals, no invented pages, quizzes, static server safety.

## Source and copyright

Open RN / WisTech Open, **Nursing Fundamentals 2e (2024), section 9.6 Preventing Infection**:
https://wtcs.pressbooks.pub/nursingfundamentals/chapter/9-6-preventing-infection/

Nursing Fundamentals 2e is published CC BY 4.0 **except where otherwise noted**. The app contains original Bengali summaries attributed to the source, not bundled third-party images. Online HTML section citations are intentionally **not** relabeled as PDF pages.

BNMC curriculum is authoritative for local course mapping, but Nandini's actual college-mandated book titles/editions have not yet been confirmed. Full first-year books are NOT included in this repo.

## Try locally

Node.js 22+:

```sh
npm test
npm start
```

Open `http://127.0.0.1:8787` on the same device.

## AI choices

**No paid API is required** for the local inference route. Configure `NANDINI_AI_PROVIDER=ollama` and a private `NANDINI_STUDENT_CODE` on the Node server. Ollama must separately be installed with `qwen3:1.7b` on the SAME machine and be listening only on `127.0.0.1:11434`. The app does not automatically install/start/download a model on shared production VPS; memory preflight and independent test are mandatory.

Server-only settings (never commit secrets): `NANDINI_AI_PROVIDER=ollama`, `OLLAMA_MODEL=qwen3:1.7b`, `NANDINI_STUDENT_CODE=long_random_code`. No OpenAI key.

The existing OpenAI provider is an **optional fallback**, not the default recommendation and not a requirement for this project. It still needs `OPENAI_API_KEY` if used.

The browser AI button is hidden unless backend is configured. `NANDINI_STUDENT_CODE` protects the endpoint and is not persisted. All live deployment must use HTTPS, app/process isolation and a reverse proxy. A source ID in a generated answer is only a pointer, **not proof that the model faithfully summarized its evidence**. Actual nurse-education QA is required before trusting the result.

For exact safe operating constraints and hardware inspection see [LOCAL_AI.md](./LOCAL_AI.md).

## Deploy safely

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [CLAUDE_HANDOFF.md](./CLAUDE_HANDOFF.md). Existing `mama-core-01` VPS is shared infrastructure: inspect before creating processes/reverse-proxy entries; **do not disturb existing deployments**.

## Medical boundary

Educational explanation and exam preparation only. No personalized medical diagnosis, prescriptions, medication doses, or unsupervised invasive procedures. Clinical practice requires instructor and institution guidance.

## Automatically loaded Open RN textbooks
The `library.html` mobile bookshelf reads **four publisher books automatically imported** under `data/books/`, so Nandini does **not** have to upload them herself. GitHub Actions imports the publisher-provided XML/XHTML text and attaches source book/chapter citations:
- Nursing Fundamentals 2e: 141 extracted text chapters
- Nursing Skills 2e: 214 extracted text chapters
- Medical Terminology 2e: 148 extracted text chapters
- Nursing Mental Health and Community Concepts 2e: 129 extracted text chapters
**Total 632 text-only chapters.** Nine chapter links fall back to the verified publisher book home page because exact URLs were not matched.

This is a text-only transformation of CC BY 4.0 published books (except where otherwise noted); images, embedded media, activity widgets and layouts were excluded. It is NOT a substitute for every original PDF component or for Nandini's college-mandated books. Do not claim PDF page numbers for these extracted XHTML chapters. The reader gives official direct PDF download links and a source-attributed in-app search, with optional server-configured Bengali AI.

The source is refreshed by running `python scripts/import_openrn.py` on a machine with internet or by GitHub's `Import Open RN Textbooks` workflow. No manual book upload needed for these four.


## Android APK, no VPS required for book reading

A working GitHub Actions build pipeline compiles a personal debug APK with all **four** text-only Open RN books (632 source chapters). See [ANDROID.md](./ANDROID.md) for how to download the latest successful artifact and install it. Verified Chrome mobile-screen automated journey tests cover notes/reload, book search, and chapter reading; real-phone validation remains pending.

The offline APK contains an **AI Server Settings** page where a future owner-managed HTTPS Ollama server URL can be saved without rebuilding the app. Only the URL is stored; student access codes are not. Server deployment is optional for static reading, notes and sample MCQs. This is not yet verified live AI on the VPS.

## October 23: redesigned bilingual book reader

The book reader is now chapter-driven with readable paragraph spacing, original English headings and list structure, mobile book typography, font controls, previous/next chapter, and English / Bangla / both reading modes. Android builds include Google ML Kit's **on-device English-to-Bengali translation** through `@capacitor-mlkit/translation`, using a bundled Capacitor bridge (no paid translation API). Initial language model download requires internet and spare device storage; translated paragraphs are stored in local IndexedDB, 28 at a time per tap. This is *machine-translated on demand*, not pretranslated or medically proofread. Native translation is unavailable in plain web browsers, which show English source only; the source-cited AI Teacher on VPS remains a separate optional future capability. Learn more in `ANDROID.md`.

## October 24: simple-Bangla hard topics (`topics.html`)

Nandini's college is recorded as **Amazan Nursing College** (spelling as given by the owner; not yet independently verified). The owner listed six first-year subjects: Fundamentals of Nursing, Anatomy & Physiology, Basic Science, Microbiology & Parasitology, ICT and English. `topics.html` explains 35 commonly difficult topics across those six subjects in simple Bangla, each with key points, a memory trick, English→Bangla key terms and one self-check MCQ (`src/easy-topics.js`).

These explanations were **written with AI help and have not been reviewed by a nursing teacher**; the page says so. Numbers that also appear in the bundled Open RN Skills text (vital-sign ranges, SpO₂, blood pH) follow that text, and a unit test checks the vital-sign numbers against it. Where an in-app Open RN chapter matches, a "বইয়ে মূল ইংরেজি পড়ো" button opens the library already searched (`library.html?book=…&q=…`). Study Coach tasks link to the matching explanation.

## October 24: Nandini's six subjects and the instant offline Tutor (`ask.html`)

The Study Coach, home page and book list now use exactly the six subjects Nandini gave, in her order: Fundamentals of Nursing, Anatomy & Physiology, Basic Science, Microbiology & Parasitology, ICT, English (36 study tasks). Behavioral Science (BNMC D111) was dropped because it is not in her list; any old progress saved for it is ignored. The Mental Health book stays on the shelf, marked as extra reading.

`ask.html` is a chat-style Tutor that runs fully on the phone (about 0.5 ms per question, no internet). `src/tutor-core.js` matches Bangla, English or Banglish questions to the 35 simple-Bangla topics, shows matching term meanings, and falls back to the four Open RN books. **It is not a generative language model**: it only shows text already in the app, so it cannot invent facts, and it says so when it has no answer. If the owner's own AI server is configured in Settings, each answer also offers the existing source-grounded `/api/books/ask` route.
