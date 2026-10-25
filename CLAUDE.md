# Rules for Claude in this repository

Start every session by reading `STATUS.md` (what is done, what is not verified) and `TOMORROW.md` (what to do next).

## Session size (the owner's rule)
- One session = one big task. Split a very large task into phases, one session each.
- When a session gets heavy (its context was compacted once, or it has run for many hours or tasks), finish the current
  step, update `STATUS.md` and `TOMORROW.md`, push, and **tell the owner in Bangla to start a new session**. Give the
  first message for it, e.g.: "CLAUDE.md, STATUS.md আর TOMORROW.md পড়ো। আজকের কাজ: …"
- Keep tool output short (tail logs, grep the failing line); do not re-read files already in context.

## Talking to the owner
- The owner is Hridoy Samadder (হৃদয় সমাদ্দার), who calls Claude "mama". Reply in short, plain Bangla; no generic advice.
- When something is unclear, ask; do not assume. Report what was verified and what was not, honestly.
- The app is a study tutor for Nandini (Diploma Nursing, 1st year, Amazan Nursing College). Her six subjects: Fundamentals
  of Nursing, Anatomy and Physiology, Basic Science, Microbiology and Parasitology, ICT, English.

## Product rules
- The Tutor's name is **শায়নি**; she says "হৃদয় সমাদ্দার স্যার শুধুমাত্র নন্দিনীর পড়ালেখায় সাহায্যের জন্য তৈরি করেছেন"
  only when asked (`src/persona.js`).
- Only Bangla in answers and voice; English terms are allowed with their Bangla meaning. Never Hindi.
- No patient-specific doses or treatment decisions. The Open RN books are international references, not her college's
  prescribed books; never claim otherwise.
- No paid API, server or subscription without the owner's explicit approval. Free tiers only.
- Never rotate several accounts or keys to stretch free quotas (Google and Groq terms forbid it). Route across different
  models and providers instead.
- Never ask for API keys in chat. Keys go in the app's Settings on the phone, or in this environment's secrets
  (`GEMINI_API_KEY`, `GROQ_API_KEY`) for `scripts/cloud-live-check.mjs`.

## Engineering
- Checks before every push: `npm test` and `node scripts/browser-smoke.mjs` (Playwright Chromium is preinstalled).
- A new browser module must be listed in `sw.js`, `server.mjs` and `scripts/prepare-android.mjs` (`tests/packaging.test.js`
  enforces it). Bump the `CACHE` version in `sw.js` when web files change.
- After changing `icon.svg`, run `node scripts/make-icons.mjs` and commit `android-icons/`.
- The APK is built only by GitHub Actions (`.github/workflows/build-android.yml`); give the owner the artifact link of the
  run for the pushed commit. Every APK is signed with `android-signing/debug.keystore`, so it installs over the old app.
- Work on the branch the session names, open a draft PR, and merge only when the owner asks.
