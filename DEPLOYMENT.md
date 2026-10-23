# Deployment: Nandini Nursing Study (no Vercel required)

**Do not deploy from ChatGPT via Desktop Commander**: its quota was exhausted during the Oct 23 session. A connected engineering agent with SSH access to `mama-core-01` can perform the final VPS steps. VPS is shared with other production services.

## Preflight (read-only first)

- Confirm VPS SSH authorization, OS, existing web server, certificates, reverse proxy, available memory and ports; inspect running Docker/systemd workloads.
- Confirm safe domain or new **subdomain** for Nandini. Do not reuse or alter existing PharmacyOS or other product routes. Do not expose the raw Node port to the Internet.
- Verify GitHub checkout authentication for **private** `hridoysamadder01-coder/NURSING-AI-TUTOR-FOR-NANDINI`.
- Verify Node.js 22+ available, or install it without changing applications' shared runtime.

## Build and local smoke test

```sh
git clone git@github.com:hridoysamadder01-coder/NURSING-AI-TUTOR-FOR-NANDINI.git
cd NURSING-AI-TUTOR-FOR-NANDINI
npm test
HOST=127.0.0.1 PORT=8787 node server.mjs
```

In another shell run `curl --fail http://127.0.0.1:8787/healthz`. The app works with AI disabled. Confirm available port (8787 is a default, not reserved).

## Production runtime

Use a dedicated non-root service user, a private deployment directory, a protected environment file outside Git, and systemd or a separate Docker Compose stack. Variables:
- `HOST=127.0.0.1`
- `PORT=<verified-unused-loopback-port>`
- `OPENAI_API_KEY=<key owned by the user>` (optional until AI go-live)
- `NANDINI_STUDENT_CODE=<long private random code>` (must accompany API key)
- `OPENAI_MODEL=gpt-5-mini` (configurable; validate availability/pricing)
- `NODE_ENV=production`

Avoid printing secrets into logs or shell history. Restart only this new service and verify logs without leaking private content.

Set up a **new** HTTPS subdomain/reverse-proxy host forwarding only to the new loopback port. Reuse the web proxy already installed; DO NOT overwrite Nginx/Caddy root configuration, touch unrelated certificates or restart unrelated containers. After adding the isolated virtual host, validate configuration before a graceful reload.

## Mandatory live acceptance checks

1. Over HTTPS, home and `tutor.html` open in Android Chrome without layout overflow.
2. The first lesson shows a working link to Open RN chapter 9.6 and clear paragraph-level citations.
3. The reference question about gloves displays appropriate source. An unrelated astronomy question says not found.
4. Select a text PDF; searching for a word returns an excerpt with the actual PDF viewer page. Scanned PDFs accurately report no selectable text.
5. MCQ score, rationale and retry function. Notes survive tab closing/reopening on the same phone.
6. With keys absent, AI controls are not active. With valid service config and explicit consent, AI responds with valid source IDs; invalid code yields 401; missing source returns refusal. Verify factual content against book, not citations alone.
7. PWA Add to Home Screen/install and offline text lesson (once visited) work. PDF extraction dependency requires first-time network.
8. No API key or access code appears in client assets or Git history; no medical/patient personal data added.

Record exact tested commit, URL, checks, pass/fail and remaining limitations. Do not claim success from green unit tests alone.
