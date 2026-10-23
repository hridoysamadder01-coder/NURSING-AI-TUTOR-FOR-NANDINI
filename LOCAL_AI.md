# Local AI proof plan on mama-core-01 (no paid API required)

## Reality check
The existing DigitalOcean droplet is Ubuntu 24.04, **2 vCPU / 4 GB RAM**, already serving other workloads. The app's 3 text-only imported nursing books are small enough to **search** cheaply. LLM inference is a separate memory/CPU problem.

**First candidate:** Ollama `qwen3:1.7b` Q4 (~1.4 GB model download, higher working memory). If other workloads leave insufficient RAM, **do not load it on production**. `qwen3:0.6b` (~523 MB download) may be used only for a feasibility experiment, not presumed strong enough for accurate Bengali nursing teaching. 4B models are not recommended for this shared 4GB server until capacity is proved.

## Read-only inspection FIRST
On the authorized host (SSH), WITHOUT installing anything or restarting any service:

```sh
date -Is
free -m
uptime
df -h /
ps -eo pid,comm,rss,%cpu --sort=-rss | head -n 20
docker stats --no-stream 2>/dev/null || true
ss -lntup | grep -E ':(80|443|8787|11434)\b' || true
command -v ollama || true
command -v node || true
```

Compare RAM **available** (not total) and swap/oom history with the existing services' peak usage. Inspect existing containers and service dependencies. Do not add swap, kill, restart or resize other workloads without owner's approval.

## If and ONLY if spare resources are verified
Use a separate non-root user/service or container with explicit memory+CPU limits and constrained concurrency. Ensure Ollama binds **only to 127.0.0.1:11434**; never publish its raw API port. Evaluate on a staging sandbox or off-peak with owner consent. Choose only one model at a time.

Official model page: https://ollama.com/library/qwen3:1.7b
Ollama API: https://github.com/ollama/ollama/blob/main/docs/api/introduction.mdx

Once locally installed/authorized, the developer can query the model:

```sh
ollama pull qwen3:1.7b
ollama list
curl -s http://127.0.0.1:11434/api/tags
```

**Don't blindly run these commands on a shared production server.** The download loads disk; inference loads working RAM and CPU.

The existing Node app supports the local model without paid API credentials:

```sh
NANDINI_AI_PROVIDER=ollama
OLLAMA_MODEL=qwen3:1.7b
NANDINI_STUDENT_CODE=<long-random-private-code>
HOST=127.0.0.1
PORT=<unused-local-port>
NODE_ENV=production
```

Put configuration in a protected runtime environment file, never in Git or a pasted chat log. Model server has a fixed local endpoint and bounded settings: 3072-token context, 300 generated tokens max, 2 inference threads, one concurrent request, 10-second keep-alive. Startup configuration does **not** prove that the model server is installed, running, or within resource budget.

## Acceptance gate
Before marking local AI ready, test with Nandini's real chapter excerpts:
1. Five fact questions, including "gloves vs hand hygiene", "standard precautions" and "sterilization vs disinfection". Confirm Bengali accuracy against the **actual source**, not citation tags alone.
2. Three "not in book" questions. Must explicitly refuse instead of inventing.
3. Two unsafe patient-specific medical-treatment questions. Must avoid giving treatment/drug doses.
4. Verify every [S1]/[S2]/[S3] pointer exists and corresponds to the evidence actually sent.
5. Measure latency p50/max, RAM available before/during/after, CPU pressure and any OOM kills while existing workloads remain healthy.

**Go only if** existing services stay stable, answers are educationally useful in Bengali and citations are genuinely grounded. Otherwise stop without hidden API spending and report exact limitation. Nothing about a narrow domain alone proves model adequacy.
