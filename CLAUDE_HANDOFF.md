# Claude: narrow last-mile handoff, minimize weekly tokens

**User's priority:** Give Nandini (Bangladesh Diploma Nursing 1st year) a real usable Bengali book-based tutor on Android; preserve honesty about textbook citations, source rights and medical safety. **Do not rebuild from scratch**, expand scope, redesign the app or repeat already-completed research.

## Work completed by ChatGPT, Oct 23, 2026
- Private GitHub repo main now contains `index.html`, `tutor.html`, `src/lesson-data.js`, `src/answer-core.js`, `server.mjs`, PWA files, tests and CI.
- `tutor.html`: six Bengali learning sections explicitly derived from Open RN Nursing Fundamentals 2e §9.6 Preventing Infection, with citation links, five verified-to-section MCQ explanations, guarded retrieval questions, optional student PDF **local** text search with actual PDF page numbers.
- `server.mjs`: optional secure authenticated source-cited LLM endpoint (requires server-side OPENAI_API_KEY + NANDINI_STUDENT_CODE). On bare static host AI stays disabled. No secret keys committed.
- GitHub Actions test suite: see latest run before claiming green. One Unicode Bengali-mark false match was fixed and the next run passed.
- Book provenance: Open RN CC BY 4.0 except exceptions. No imported copyrighted publisher books. No claim that the 2018 BNMC curriculum is the student's complete current books.
- Vercel connection blocked by 403 team scope, and Remote Desktop Commander was quota-blocked. Existing DigitalOcean droplet `mama-core-01` is active.

## ONLY do remaining last mile
1. Verify current repo CI, syntax and the main mobile UI; repair real failures, not cosmetic rewrites.
2. Inspect existing VPS services first (READ ONLY). Safely deploy a separate service on the existing VPS over HTTPS, following `DEPLOYMENT.md`, without modifying existing apps. If an SSH credential or domain is absent, report exact blocker and avoid reckless changes.
3. If API key/access code already authorized and available, configure privately and live-test source-cited Bengali AI; otherwise leave it disabled and state exactly what's missing. Never invent a key or put it in frontend.
4. Test Nandini's actual Android phone/PWA and her actual college book (edition, page alignment). Scanned-image PDFs need OCR, not currently implemented.
5. Deliver the working HTTPS URL, test evidence, and concise remaining issues. **STOP** when done. Don't consume remaining weekly tokens on broad research, unneeded features, or new architecture.

## Acceptance proof
A first-year learner must read an attributed lesson, search a real personal book and see real page references, complete grounded MCQs, retain notes, and if AI enabled, get Bengali explanations supported by selected book excerpts. Do not call search-only retrieval a working generative AI tutor.
