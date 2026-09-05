# BlockRun Media — Codex plugin

Pay-per-call **image / video / audio** for OpenAI Codex, with a spend gate and a
running cost meter. Use a BlockRun account API key or pay each call in USDC from a local wallet
via the [BlockRun MCP](https://github.com/BlockRunAI/blockrun-mcp) (media profile).

This is the **Codex port** of [`BlockRunAI/blockrun-claude-plugin`](https://github.com/BlockRunAI/blockrun-claude-plugin)
(the Claude Code plugin). The portable core — the MCP server, the spend
estimator, the real-ledger tally, and the hook scripts — is shared verbatim; only
the manifests and paths are Codex-shaped.

## What's inside

| Component | File | Notes |
|---|---|---|
| MCP server (media profile) | `.mcp.json` | `npx @blockrun/mcp@latest --profile media` |
| Spend gate (PreToolUse) | `hooks/spend-gate.js` | Estimates the call, asks to confirm above `BLOCKRUN_ASK_THRESHOLD`, soft-caps at `BLOCKRUN_SESSION_CAP` |
| Spend tally (PostToolUse) | `hooks/spend-tally.js` | Records **real** settled spend from `~/.blockrun/cost_log.jsonl`, feeds a one-line receipt into context |
| Cost tables | `lib/estimate.js` | Mirrors the live `@blockrun/mcp` pricing |
| Ledger reader | `lib/ledger.js` | Reads the x402 settlement ledger (no keys) |
| `spend-insights` skill | `skills/spend-insights/` | today / 7d / 30d / all-time + projection |
| `announce-cost` skill | `skills/announce-cost/` | Tells the agent to state the price before a paid call |

## Account API setup

Register at [user.blockrun.ai](https://user.blockrun.ai), create a key at [API Keys](https://user.blockrun.ai/dashboard/keys), and add [Credits](https://user.blockrun.ai/dashboard/credits). Set `BLOCKRUN_API_KEY` in the environment that launches Codex; `.mcp.json` intentionally does not contain credentials and the MCP child inherits it.

Account mode needs no wallet and is supported by the MCP release containing [BlockRun MCP PR #136](https://github.com/BlockRunAI/blockrun-mcp/pull/136). Until that release is published, replace `@blockrun/mcp@latest` with its exact local review build. Wallet mode remains available on Solana or Base, with Solana first for new users. Wallet settlement meters read only x402 records; use the credits portal for authoritative account charges. The confirmation hook still shows an estimate before account calls.

## Install

```
codex plugin marketplace add BlockRunAI/blockrun-codex-plugin
codex plugin install blockrun-media
```

Or add the MCP directly to `~/.codex/config.toml`:

```toml
[mcp_servers.blockrun]
command = "npx"
args = ["-y", "@blockrun/mcp@latest", "--profile", "media"]
env = { BLOCKRUN_INLINE_IMAGES = "1" }
```

## Config (env)

| Var | Default | Effect |
|---|---|---|
| `BLOCKRUN_ASK_THRESHOLD` | `0` | Confirm any paid call above this USD (0 = confirm every paid call) |
| `BLOCKRUN_SESSION_CAP` | unset | Soft per-session budget; the gate declines calls that would exceed it |
| `BLOCKRUN_INLINE_IMAGES` | `1` here | Return an inline image preview alongside the URL |

## Notes vs the Claude Code plugin

- **No status line.** Codex has no command-driven status line ([openai/codex#20244](https://github.com/openai/codex/issues/20244)), so the live session-spend bar is dropped. The per-call receipt (PostToolUse `additionalContext`) still shows spend in-line.
- **Slash commands → skills.** Codex steers command-style helpers to skills, so `/insights` becomes the `spend-insights` skill.
- **Spend confirmation may render better here.** Codex supports MCP elicitation ([#17043](https://github.com/openai/codex/pull/17043)), so the MCP's own `confirm-spend` can prompt where the Claude Code VS Code extension does not.

MIT © BlockRun
