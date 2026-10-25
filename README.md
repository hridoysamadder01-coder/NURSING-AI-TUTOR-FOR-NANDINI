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

## October 24: on-device local AI with Bangla RAG (experimental, owner testing first)

The Android app can now run a language model **fully on the phone** (no internet after a one-time download), on top of the Tutor's retrieval:

- **RAG** (`src/rag.js`): BM25 over 6,457 passages of the four Open RN books, a Bangla→English nursing lexicon (including English words typed in Bangla letters), and the verified simple-Bangla topics. Questions with no grounded match never reach the model; the app answers "পাইনি" directly. The prompt asks the model to reuse the verified sentences and not add facts.
- **Engine** (`android-llm/`): llama.cpp (pinned through the `llama-cpp-python` 0.3.16 sdist, SHA-256 checked in `scripts/add-local-llm.mjs`) behind a small JNI library and the `NandiniLlm` Capacitor plugin. ggml is built with one CPU backend per ARM generation (armv8.0 / 8.2 dotprod / 8.2 fp16 / 8.6 i8mm) and picks the best at runtime, so older chips such as Snapdragon 680 do not crash. Tokens stream as UTF-8 bytes so Bengali characters are never split. CI fails if these libraries are missing from the APK.
- **Model**: Gemma 3 4B (Q4_0, 2.37 GB, Gemma Terms of Use), downloaded from a pinned Hugging Face revision into app-private storage with resume, size and GGUF checks. Needs a phone with about 6 GB RAM or more.

How the model was chosen (desktop CPU, 4 threads, same RAG prompts, greedy decoding):

| Model | Size | Result on Bangla nursing questions |
|---|---|---|
| Gemma 3 1B, Qwen 2.5 1.5B, Llama 3.2 1B | 0.7–1.1 GB | Unusable: mostly English or broken Bangla, frequent invented facts |
| Gemma 3n E2B | 3.0 GB | Fluent, but 3 of 10 answers had factual errors |
| **Gemma 3 4B** | 2.4 GB | 10 of 10 faithful in the first set; in a second set of 8, one wrong answer (PPE order presented for sterile gloves) and it correctly refused a medicine-dose question |

**Talking to the Tutor like a patient friend.**
- Everyday replies get an instant friendly answer from the app, in rotating wordings so it does not repeat itself: "hi mama", "কেমন আছো", "bondhu", "ধন্যবাদ", "বুঝেছি".
- Talk about herself or her feelings ("ami khub tired", "পরীক্ষার ভয় লাগছে") goes to a separate chat prompt: 2–3 warm sentences, no facts or medicines, a suggestion to tell family when she is unwell, then back to studying.
- **"বুঝিনি" can be pressed as often as needed and never returns the same answer.** Asking the same question again counts as "বুঝিনি" too. Each round:
  - shows a different verified view: gist + memory trick, then step-by-step points, then term meanings, then a tap-to-answer MCQ;
  - asks the local AI for a different style of explanation: short core idea, then step by step, then question-and-answer.
  - After all three styles are used, the AI repeats them with light sampling (temperature 0.6), so the wording changes each time.

Desktop tests with Gemma 3 4B shaped this design:
- Pasting the previous answer into the prompt made the model copy it.
- Two "example" rounds over the same text gave identical answers.
- Asking it to explain term meanings or an MCQ in its own words produced wrong facts (for example "ধমনি শরীরের বাইরে থেকে রক্ত আনে").

So terms and MCQs are shown by the app, and the AI only gets the short slices it explained correctly. Each slice keeps the topic points that match the question.

Desktop check of the warm prompt (13 questions including two follow-ups, Gemma 3 4B, greedy): vital signs, osmosis, RAM/ROM, Sims position and hypoxia answers were exact, numbers included. Two answers had a wrong fact: "ভাল্‌ভ থাকে ধমনিতে", and "ধমনি রক্ত ফুসফুসে নেয়" in a "simpler" re-explanation. The old prompt made the same valve error, so the topic sentence now says where valves are; in a recheck the model still reversed it once in three answers. A stricter "one source sentence per point" prompt was worse (a wrong "পাইনি", a reversed privacy rule). **So the 4B model is a helper, not a source of truth**: its answer always sits under the verified card with the "AI ভুল করতে পারে" note, and "প্রতিটি প্রশ্নে AI নিজে থেকে উত্তর দেবে" can be switched off in Settings. Patient dose questions ("কত mg দেব", "dose") are answered by the app with a fixed safety note and never reach the model.

On the desktop CPU, Gemma 3 4B produced a full answer in roughly 4–13 seconds. **Speed on a real phone has not been measured yet**; expect it to be several times slower on a mid-range phone. Settings has a speed test for this. The Tutor always shows the instant verified card first and labels the AI answer "AI ভুল করতে পারে". Nothing here has been tested on a physical Android device yet.
