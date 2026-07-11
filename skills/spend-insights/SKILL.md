---
name: spend-insights
description: Show BlockRun spend insights — today / 7d / 30d / all-time totals, a by-endpoint breakdown, and a monthly/yearly projection, read from the real x402 settlement ledger. Use when the user asks how much they've spent on BlockRun, wants a cost report, breakdown, or projection.
---

Run the bundled insights script and show its output verbatim:

```
node "${PLUGIN_ROOT}/scripts/insights.js"
```

It reads `~/.blockrun/cost_log.jsonl` (the real settlement ledger the `@blockrun/llm` SDK appends to — ground truth, not an estimate) and prints:

- Totals: today · 7d · 30d · all-time (with call count)
- Daily average (30d) → projected month / year
- By-endpoint breakdown for the last 30 days

If the script says the ledger is empty, tell the user no BlockRun spend has been recorded yet. Do not read or print any wallet keys — only the cost ledger is used.
