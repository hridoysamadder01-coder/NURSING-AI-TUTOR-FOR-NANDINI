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

The source is refreshed by running `python scripts/import_openrn.py` on a machine with internet or by GitHub's `Import licensed textbooks` workflow (manual run only, so book files never change by surprise on a push). No manual book upload needed for these four.


## Android APK, no VPS required for book reading

A working GitHub Actions build pipeline compiles a personal debug APK with all **four** text-only Open RN books (632 source chapters). See [ANDROID.md](./ANDROID.md) for how to download the latest successful artifact and install it. Verified Chrome mobile-screen automated journey tests cover notes/reload, book search, and chapter reading; real-phone validation remains pending.

The app's logo is `icon.svg` (a nurse's cap). `node scripts/make-icons.mjs` renders it into the Android launcher icons in `android-icons/` (legacy, round, adaptive foreground and background, launch-screen logo); `scripts/add-local-llm.mjs` copies them over Capacitor's default icons and splash, and CI checks they are in the APK.

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

**Strong mode (online) and talk mode.**
- **Strong mode (`src/cloud-ai.js`):** with internet and a key in Settings, the Tutor's AI answer comes from a bigger cloud model, using the same verified RAG prompt.
  - Route: Gemini 3.5 → 3.1 → 2.5 Flash-Lite (each has its own free quota), then Groq GPT-OSS 120B → Qwen3.8 27B, then the phone's Gemma.
  - Limits and failures: a model that hits its free limit (429) cools down (Retry-After, else 10 min); a rejected key skips that provider; a model silent for 15 s is skipped.
  - Keys live only in the phone's storage, never in the repository or the APK.
  - The online models may ask back when a question is unclear (her reply completes the question), see their previous explanation in "বুঝিনি" rounds, and the friend chat remembers its last turns.
  - Using several accounts to stretch free quotas is against Google's API terms ("will not attempt to circumvent such limitations"), so the app routes across different models and providers instead.
- **Talk mode** (the waveform button next to 🎤) is a hands-free spoken conversation, like ChatGPT's voice mode.
  - **Online with a Gemini key: Gemini Live** (`src/live-talk.js`, `gemini-3.8-live`). It hears 16 kHz PCM from the microphone (`src/talk-audio.js`) and answers with 24 kHz audio.
  - Before saying a fact it calls the `lookup_nursing` tool, which the app answers from the verified notes and books: doses get the fixed note, off-topic gets NOT_FOUND.
  - Transcripts show on screen and stay in the chat. The microphone is not sent while the Tutor speaks; tapping the ball cuts it off.
  - Data saver: only her speech is sent (with a 0.5 s lead-in and 1.4 s tail, then `audioStreamEnd`), not the silence while she thinks. The bar follows the room's quiet level and never rises while she speaks. The Tutor's own voice (24 kHz PCM from Live) is most of the data and cannot be reduced.
  - With earphones or a headset (Android `AudioManager` outputs: wired, USB, Bluetooth) the microphone stays on while the Tutor speaks, so she can interrupt it by voice; on the loudspeaker it is tap-to-interrupt, so the Tutor does not hear itself.
  - Only Bangla: the instruction says so first (Live picks its language by itself), and a reply whose transcript comes out in Hindi or another script is cut off and asked again in Bangla (at most twice in a row). English terms are allowed, with their Bangla meaning.
  - **Offline**, the phone's recognizer and voice run a listen → answer → speak loop, with answers in a short spoken style.
- **🎤 dictation** online sends a recording that stops after silence to Gemini Flash-Lite to be written down word for word (JSON reply, Bangla script, her English terms in English), then Groq `whisper-large-v3` (`bn`, with a spelling prompt), then the phone's own recognizer. The same ears serve talk mode's level 2. Answers are read aloud with Gemini TTS (`gemini-3.8-flash-lite-tts`) when online, else the phone's Bangla voice.
- **Proof run with real keys:** `GEMINI_API_KEY=… GROQ_API_KEY=… node scripts/cloud-live-check.mjs out/`. It runs:
  - every model on Bangla questions;
  - a TTS → listening round trip through each Gemini model and Whisper;
  - a Gemini Live turn from a recorded Bangla question, with the spoken answer written back as text and checked to be Bangla.

**Voice to voice (Android app).**
- The 🎤 button in the Tutor listens in Bangla and shows the words while she talks. The answer is then read aloud: the AI answer once it is complete, or the verified card when there is no AI part. Every AI answer and topic card also has a 🔊 button.
- It uses the phone's own engines through a small `NandiniVoice` plugin (`android-llm/`): Android `SpeechRecognizer` with `bn-BD`, and `TextToSpeech` with a Bangla voice.
- **Recognition is on-device only by default** (`EXTRA_PREFER_OFFLINE`), so her voice does not leave the phone. If the phone has no offline Bangla pack, Settings → "কণ্ঠে কথা বলা" explains how to get one. It also has an opt-in switch for online recognition, which sends the audio to Google.
- Settings also shows whether a Bangla voice is installed, has a button to install one, and a test button.
- First phone test (vivo V2266A): every 🎤 press failed with errors 5 ("client") and 11 ("server disconnected"), the signs of an engine that cannot serve the request. The plugin now:
  - binds to Google's recognition service when it is installed, instead of the phone's default engine;
  - gives every session a fresh recognizer and releases it afterwards;
  - opens the system speech dialog if the in-app recognizer still fails.

  Settings shows which engine is used. Not yet confirmed on the phone.

Desktop check of the warm prompt (13 questions including two follow-ups, Gemma 3 4B, greedy): vital signs, osmosis, RAM/ROM, Sims position and hypoxia answers were exact, numbers included. Two answers had a wrong fact: "ভাল্‌ভ থাকে ধমনিতে", and "ধমনি রক্ত ফুসফুসে নেয়" in a "simpler" re-explanation. The old prompt made the same valve error, so the topic sentence now says positively where valves are (heart, and veins of the arms and legs). The model still gets this wrong sometimes: in the latest run one of six artery/vein answers said valves are in both. A stricter "one source sentence per point" prompt was worse (a wrong "পাইনি", a reversed privacy rule). **So the 4B model is a helper, not a source of truth**: its answer always sits under the verified card with the "AI ভুল করতে পারে" note, and "প্রতিটি প্রশ্নে AI নিজে থেকে উত্তর দেবে" can be switched off in Settings. Patient dose questions ("কত mg দেব", "dose") are answered by the app with a fixed safety note and never reach the model.

On the desktop CPU, Gemma 3 4B produced a full answer in roughly 4–13 seconds. **Speed on a real phone has not been measured yet**; expect it to be several times slower on a mid-range phone. Settings has a speed test for this. The Tutor always shows the instant verified card first and labels the AI answer "AI ভুল করতে পারে". Nothing here has been tested on a physical Android device yet.

## November 12: evidence-based bookshelf (issue #2, phase 1)

**What is in the app now: 12 bundled books, 2,676 text chapters.** `data/books/catalog.json` lists only books whose text is really in the app. `data/books/shelf.json` is the hand-kept evidence: the printed books Nandini owns, her subjects, and which bundled book may be sent to a language model.

| Book (id) | Publisher | Chapters | Licence | Tutor's AI |
|---|---|---|---|---|
| Nursing Fundamentals 2e, Nursing Skills 2e, Medical Terminology 2e, Nursing Mental Health and Community Concepts 2e | Open RN / WisTech Open | 141 + 214 + 148 + 129 | CC BY 4.0 (unchanged since October) | allowed |
| SEER Training Modules: Anatomy & Physiology (`seer-anatomy`) | U.S. National Cancer Institute | 105 | text free of copyright, credit NCI | allowed |
| Anatomy and Physiology 2e, Microbiology, Biology 2e, Chemistry 2e, Psychology 2e, Introduction to Sociology 3e, Workplace Software and Skills (`openstax-*`) | OpenStax, Rice University | 310 + 333 + 445 + 251 + 185 + 221 + 194 | CC BY-NC-SA 4.0 | **not permitted** |

- **OpenStax books are for reading and plain search only.** Every OpenStax book page states: "This book may not be used in the training of large language models or otherwise be ingested into large language models or generative AI offerings without OpenStax's prior written permission." `aiBookIds()` (`src/library-catalog.js`) is a fail-closed allow-list, `chunkBooks()` refuses such a book again, and the server search only loads allowed books. The reader shows the publisher's line "Access for free at ..." on every chapter and under search results.
- **Nandini's six Neuron books are recorded as owned on paper, nothing more.** The titles, editors and the one visible edition (Anatomy & Physiology, 10th Edition) come from the owner's 20 photographs. No Neuron text is in the repository or the APK; a photograph of a cover is not permission to copy a book. The ICT title is `title_unconfirmed`. The shelf shows them without any button: there is nothing to open or search.
- **Subjects:** the six subjects the owner gave stay in the Study Coach. Behavioral Science (she owns the book; BNMC 2018 lists it) is shown as waiting for confirmation and is not in the plan.
- **Coverage is never called "full".** Each subject is `unverified` (a whole textbook is bundled, but it was not compared with her book or the syllabus) or `partial` (Microbiology & Parasitology: no dedicated parasitology text; English: medical words only). The chapter-by-chapter gap table is blocked until the Neuron tables of contents and the BNMC units are available.
- **Tutor grounding:** "where do I read this" links (`src/book-finder.js`, `data/books/toc-index.json`) point to exact chapters of all bundled books using titles and headings only, with no page numbers. A question about her own printed book ("আমার বইয়ের ৫০ পৃষ্ঠায় কী আছে?") gets a fixed note that the book's text is not in the app, and the models are told not to guess its contents.
- **Importers:** `scripts/import_openstax.py` and `scripts/import_seer.py` read the publishers' own sites, check the licence statement at import time, drop images, figures, figure captions and media, and record every skipped page. Run `node scripts/build-book-index.mjs` after any import.
- **Import integrity is measured, not assumed.** Each importer compares every publisher page with the text it produced (`word_coverage` in `scripts/bookimport.py`) and refuses to publish a book when more than 1% of the page words are unaccounted for (12% on a single page). The catalog records the result (`source_words`, `missing_words`): at most 0.16% per book, and the remainder is counting noise from words split by markup. The first import, pushed earlier the same day, had silently lost 6.5% of the chemistry book (the sentences of every paragraph that holds an equation) and smaller amounts elsewhere; this check exists because of that.
- **How the text is written:** questions and answer keys keep the book's own numbers as plain lines; items of an ordered list carry their number; tables keep their titles; powers, ion charges and formula subscripts are real superscript and subscript characters (10⁻¹⁴, Ca²⁺, H₂O), other equations are on one line.
- **Credit on every view:** the reader shows, under every chapter and every list of search hits, the publisher's credit line, the licence as a link, and the note that this is a changed, text-only copy, for all 12 books.

**Independent review: not completed.** A multi-reviewer check of this work was started and stopped by the account's usage limit before any reviewer reported; only what could be recovered from its partial notes was checked and fixed.

**Not done yet (next phases):** private on-device import of Nandini's own pages or PDFs with OCR; the gap table; a parasitology text (candidate: CDC DPDx); a Communicative English textbook; WisTech Open general-education books. Nothing here has been checked on a real phone.

## November 12 (Milestone 2B): Scan & Explain — read one page, explain it

`scan.html` lets Nandini photograph or choose **one page of any book** and have Shayni explain that page — no need to import a whole six-book set.

- **On-device, offline OCR.** Tesseract.js (English + Bengali) is bundled under `vendor/tesseract/` (~6.4 MB, pinned; `scripts/fetch-ocr-assets.sh` refreshes it) and cached by `sw.js`, so reading a page needs no internet. `src/page-ocr.js` loads only these bundled assets — never a CDN. The browser smoke test reads a page with zero external requests.
- **Honest about accuracy.** The OCR result is always an **editable draft** with a confidence percentage; a low/blurry read asks for a clearer photo, and nothing is invented. Measured on clean rendered English nursing text: 100% character accuracy, ~0.5 s. Bengali accuracy could not be measured in the build environment (no Bengali font) and must be checked on a real phone photo.
- **Page-grounded explanation.** `buildPageMessages` (`src/rag.js`) makes Shayni explain **only** the page's text, with provenance "তোমার তোলা পাতা", no outside facts, no patient dose, and an honest abstain when the text is unreadable.
- **Privacy, on-device first.** The page **image never leaves the phone**. The explanation uses the on-device Gemma model by default (fully offline); if that is not installed, only the extracted **text** (not the image) can go to the online AI, and only after an explicit consent tick — never silently.
- **Graceful fallback.** On a device without WebAssembly SIMD, the app says so and lets her type the text instead; Shayni still explains it.
- Verification: `npm test` (74 pass; grounding, privacy and offline-asset tests) and `node scripts/browser-smoke.mjs` (real OCR reads a page, the on-device model explains it, the image is never sent). APK grows from ~30.7 MB to ~36.5 MB. Not verified on a real phone; Bengali OCR accuracy not yet measured.
