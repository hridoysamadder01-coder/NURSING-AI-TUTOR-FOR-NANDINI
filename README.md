# Nursing AI Tutor for Nandini 🌿

**Owner:** Hridoy · **Learner:** Nandini, Bangladesh Diploma in Nursing Science & Midwifery, Year 1.

**Status: verifiable early study app, NOT yet a complete nursing AI tutor.** GitHub Actions validates evidence search, MCQ integrity and server routes. Real Android/PWA field testing and live AI service remain unverified.

## What works in code

- `index.html`: Bengali-friendly mobile home, 7 first-year course placeholders, student-uploaded PDF reader, sample general MCQs, local personal notes.
- `tutor.html`: one **real Open RN Nursing Fundamentals 2e** chapter (9.6 Preventing Infection), 6 Bengali explanation sections with precise **chapter/subheading links**, five chapter-based MCQs with explanations, and question-to-lesson retrieval.
- User PDFs: local, client-side PDF.js text extraction (first 100 pages, max 20MB); relevant **actual PDF page numbers** and verbatim excerpts, NOT fabricated page citations or generated translations. Scanned-image-only PDFs require OCR, which is not yet built.
- `server.mjs`: dependency-free HTTPS-reverse-proxy-ready Node backend with optional authenticated OpenAI Responses API. When configured, can provide Bengali explanations from up to four submitted cited passages. Citations are checked for valid passage IDs, but citation validity does not itself prove every factual claim correct. Student must check the original material.
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

The AI button stays hidden unless **both** `OPENAI_API_KEY` and `NANDINI_STUDENT_CODE` are configured **on the server**. Never place either value in HTML, GitHub source or a public environment file.

```sh
HOST=127.0.0.1 PORT=8787 OPENAI_MODEL=gpt-5-mini \
OPENAI_API_KEY=your_secret_key NANDINI_STUDENT_CODE=your_private_access_code npm start
```

The example above is for illustration only; for deployment load secrets from a protected file (not shell history). The server limits requests per IP and request size; keep the private tutor behind HTTPS and, ideally, additional network/app protections. The app does not store the access code. **Uploading a PDF in the reader never uploads that PDF to this server.** When the student deliberately checks consent and uses AI on their own PDF, up to three selected short excerpts are sent to the server and onward to the AI provider.

The real AI feature requires a paid external API key and live tests; **do not call the app fully operational AI until that is verified**.

## Deploy safely

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [CLAUDE_HANDOFF.md](./CLAUDE_HANDOFF.md). Existing `mama-core-01` VPS is shared infrastructure: inspect before creating processes/reverse-proxy entries; **do not disturb existing deployments**.

## Medical boundary

Educational explanation and exam preparation only. No personalized medical diagnosis, prescriptions, medication doses, or unsupervised invasive procedures. Clinical practice requires instructor and institution guidance.

## Automatically loaded Open RN textbooks
The `library.html` mobile bookshelf reads **three publisher books automatically imported** under `data/books/`, so Nandini does **not** have to upload them herself. GitHub Actions imports the publisher-provided XML/XHTML text and attaches source book/chapter citations:
- Nursing Fundamentals 2e: 141 extracted text chapters
- Nursing Skills 2e: 214 extracted text chapters
- Medical Terminology 2e: 148 extracted text chapters
**Total 503 text-only chapters.** Nine chapter links fall back to the verified publisher book home page because exact URLs were not matched.

This is a text-only transformation of CC BY 4.0 published books (except where otherwise noted); images, embedded media, activity widgets and layouts were excluded. It is NOT a substitute for every original PDF component or for Nandini's college-mandated books. Do not claim PDF page numbers for these extracted XHTML chapters. The reader gives official direct PDF download links and a source-attributed in-app search, with optional server-configured Bengali AI.

The source is refreshed by running `python scripts/import_openrn.py` on a machine with internet or by GitHub's `Import Open RN Textbooks` workflow. No manual book upload needed for these three.

