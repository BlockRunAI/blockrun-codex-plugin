---
name: announce-cost
description: Use whenever you are about to generate or edit media with the BlockRun tools — image, video, music, speech, or enrolling a face (realface). Before each PAID call, state the model and estimated USD cost in your reply so the user sees the price before the spend-confirmation dialog. Pricing reference for BlockRun media tools.
---

# Announce BlockRun cost before charging

The BlockRun media tools spend real USDC per call. The client's confirmation
dialog does not reliably show the cost, so **you must surface it yourself**.

**Before every paid `blockrun_*` call**, write one short line in your reply
stating the model and the estimated cost, then make the call. Example:

> Generating with **cogview-4** — estimated **~$0.015**. (Approve the prompt to proceed.)

Do this for `blockrun_image`, `blockrun_video`, `blockrun_music`,
`blockrun_speech` (speak / sound_effect), and `blockrun_realface`
(enroll / portrait). Free actions need no announcement: `blockrun_wallet`,
`blockrun_models`, `blockrun_speech` action `voices`, `blockrun_realface`
actions `list` / `init` / `status`, and crypto/fx/commodity `blockrun_price`.

If the user asked for several images/clips at once, announce the **total**
(per-item cost × count) before starting.

## Estimated pricing (USD)

**Image** (`blockrun_image`, 1024² base list price; larger sizes cost more where a range is shown):

| Model | ~Cost |
|-------|-------|
| `zai/cogview-4` | $0.015 |
| `xai/grok-imagine-image` | $0.02 |
| `openai/gpt-image-1` | $0.02–0.04 |
| `xai/grok-imagine-image-2.0` | $0.04 |
| `bytedance/seedream-5-pro` | $0.045–0.09 |
| `google/nano-banana` | $0.05 |
| `xai/grok-imagine-image-pro` | $0.05 |
| `openai/gpt-image-2` (default) | $0.06–0.12 |
| `google/nano-banana-2` | $0.09 |
| `google/nano-banana-pro` | $0.10–0.15 |
| `openai/gpt-image-2.5-flare` | $0.28–0.56 |
| `openai/gpt-image-2.5-sunburst` | $0.28–0.56 |

**Video** (`blockrun_video`, per second × duration, at the model's default resolution):

| Model | ~Cost/sec |
|-------|-----------|
| `xai/grok-imagine-video` (default) | $0.05 (480p) · $0.07 (720p) |
| `xai/grok-imagine-video-1.5` | $0.08 (480p) · $0.14 (720p) · $0.25 (1080p) |
| `bytedance/seedance-1.5-pro` | $0.071 |
| `bytedance/seedance-2.0-mini` | $0.080 |
| `bytedance/seedance-2.0-fast` | $0.165 |
| `bytedance/seedance-2.0` | $0.227 (720p; ~2.25× at 1080p, ~9× at 4K) |
| `bytedance/seedance-2.5` | $0.316 |
| `azure/sora-2` | $0.105 |

e.g. `grok-imagine-video` 8s ≈ $0.40; `seedance-2.0-fast` 5s ≈ $0.83.

**Other:** `blockrun_music` ≈ $0.16/track · `blockrun_speech` TTS ≈ $0.05/1k chars
(flash/turbo) or $0.10/1k (multilingual-v2, v3), sound effect ≈ $0.0525 ·
`blockrun_realface` enroll/portrait ≈ $0.01 · paid stock `blockrun_price` ≈ $0.001.

These are estimates to inform the user; the gateway settles the exact amount.
