// Shared cost estimator for BlockRun media tools.
// Returns { usd: number, label: string } — a conservative per-call estimate
// derived from the tool name + arguments. Used by both the PreToolUse gate
// (decide allow vs ask) and the PostToolUse tally (record session spend).
//
// Estimates are intentionally rough upper-ish bounds; the MCP/gateway settles
// the real amount. They exist to inform the user, not to bill.
//
// Prices MIRROR the live @blockrun/mcp tables (src/tools/{image,video,music,
// speech,realface}.ts). Keep them in sync when the MCP catalog changes.

// Per-image USD by model. Base = 1024x1024 list price; larger renders cost
// more on the models in IMAGE_LARGE (matches image.ts GENERATE_MODEL_COST /
// LARGE_SIZE_COST / LARGE_SIZE_THRESHOLD / LARGE_SIZE_MIN_DIM_MODELS).
// Refreshed against @blockrun/mcp and the live catalog on 2026-10-20.
const IMAGE = {
  "zai/cogview-4": 0.015,
  "xai/grok-imagine-image": 0.02,
  "openai/gpt-image-1": 0.02,
  "xai/grok-imagine-image-2.0": 0.04,
  "bytedance/seedream-5-pro": 0.045,
  "google/nano-banana": 0.05,
  "xai/grok-imagine-image-pro": 0.05,
  "openai/gpt-image-2": 0.06,
  "google/nano-banana-2": 0.09,
  "google/nano-banana-pro": 0.10,
  "openai/gpt-image-2.5-flare": 0.28,
  "openai/gpt-image-2.5-sunburst": 0.28,
};
const IMAGE_DEFAULT = 0.06; // openai/gpt-image-2 (the MCP default)
const IMAGE_LARGE = {
  "openai/gpt-image-1": 0.04,
  "openai/gpt-image-2": 0.12,
  "openai/gpt-image-2.5-flare": 0.56,
  "openai/gpt-image-2.5-sunburst": 0.56,
  "google/nano-banana-pro": 0.15, // 4096px tier
  "bytedance/seedream-5-pro": 0.09, // both sides > 1024
};
// Where each model's large tier starts, in max(w,h); 1024 when unlisted.
const IMAGE_LARGE_THRESHOLD = {
  "google/nano-banana-pro": 2048, // same price through 2048x2048
};
// Seedream's large tier is keyed on the SMALLER side, not the larger one.
const IMAGE_LARGE_MIN_DIM = new Set(["bytedance/seedream-5-pro"]);

// Per-second USD by video model, as CHARGED (margin included) at the model's
// default resolution, and per resolution where the model prices it. Seedance
// is token-priced upstream; these are the per-second figures GET /v1/models
// publishes at the 720p baseline, rounded UP to 4dp. Image-to-video costs
// the same as text-to-video on every model (video.ts).
const VIDEO_RATE = {
  "xai/grok-imagine-video": 0.05,
  "xai/grok-imagine-video-1.5": 0.08,
  "bytedance/seedance-1.5-pro": 0.0708,
  "bytedance/seedance-2.0-mini": 0.0798,
  "bytedance/seedance-2.0-fast": 0.1652,
  "bytedance/seedance-2.0": 0.2271,
  "bytedance/seedance-2.5": 0.3156,
  "azure/sora-2": 0.105,
};
// Grok bills per resolution, no margin (video.ts GROK_PRICE_PER_SECOND).
const VIDEO_RATE_BY_RES = {
  "xai/grok-imagine-video": { "480p": 0.05, "720p": 0.07 },
  "xai/grok-imagine-video-1.5": { "480p": 0.08, "720p": 0.14, "1080p": 0.25 },
};
// Seedance token cost scales with resolution (video.ts RESOLUTION_TOKEN_FACTOR).
const SEEDANCE_RES_FACTOR = { "480p": 0.5, "720p": 1, "1080p": 2.25, "4K": 9 };
const VIDEO_DEFAULT_RATE = 0.05; // xai/grok-imagine-video (the MCP default)
const VIDEO_DEFAULT_SECS = { // per-model default duration
  "xai/grok-imagine-video": 8,
  "xai/grok-imagine-video-1.5": 8,
  "bytedance/seedance-1.5-pro": 5,
  "bytedance/seedance-2.0-mini": 5,
  "bytedance/seedance-2.0-fast": 5,
  "bytedance/seedance-2.0": 5,
  "bytedance/seedance-2.5": 5,
  "azure/sora-2": 4,
};

const MUSIC_COST = 0.1575; // minimax/music-2.5+ (music.ts MUSIC_COST)

// Speech per-1k-char rate by model (speech.ts). flash/turbo $0.05, others $0.10.
const SPEECH_RATE = {
  "elevenlabs/flash-v2.5": 0.05,
  "elevenlabs/turbo-v2.5": 0.05,
  "elevenlabs/multilingual-v2": 0.10,
  "elevenlabs/v3": 0.10,
  "bytedance/seed-audio-1.0": 0.30, // display rate; bills per output second
};
const SPEECH_DEFAULT_RATE = 0.05; // elevenlabs/flash-v2.5 (the MCP default)
const SOUND_EFFECT_COST = 0.0525;

// Chat models billed $0 — mirrors @blockrun/mcp FREE_CHAT_MODELS
// (src/utils/constants.ts), refreshed 2026-10-20. Membership by id, not
// vendor: cohere/ and poolside/ have $0 models, and not every nvidia/ id is
// guaranteed free. Sources: GET /v1/models billing_mode "free" and the account
// price sheet (blockrun.ai/api/pricing) at $0.
const FREE_CHAT_MODELS = new Set([
  "nvidia/gpt-oss-20b", "nvidia/nemotron-3-super-120b", "nvidia/llama-3.2-11b-vision",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", "cohere/north-mini-code", "poolside/laguna-xs-2.1",
  "nvidia/gpt-oss-120b", "nvidia/nemotron-3-ultra-550b", "nvidia/step-3.7-flash", "nvidia/mistral-nemotron",
  "nvidia/nemotron-nano-12b-v2-vl", "nvidia/nemotron-nano-9b-v2", "nvidia/nemotron-3.5-lightning",
  "nvidia/muse-glimmer-30b", "nvidia/gemma-4-31b", "nvidia/nemotron-3-super-120b-a12b-free",
  "nvidia/qwen3.5-397b-a17b", "nvidia/nemotron-ultra-253b", "nvidia/nemotron-super-49b", "nvidia/deepseek-v3.2",
  "nvidia/nemotron-3-nano-omni-nim",
  "nvidia/mistral-large-3-675b", "nvidia/qwen3-coder-480b", "nvidia/devstral-2-123b", "nvidia/glm-4.7",
  "nvidia/llama-4-maverick", "nvidia/qwen3-next-80b-a3b-instruct", "nvidia/qwen3.5-122b-a10b",
  "nvidia/seed-oss-36b", "nvidia/mistral-small-4-119b",
]);
// nvidia/deepseek-v4-pro and nvidia/deepseek-v4-flash are NOT here: the
// gateways retired both (unknown-model 400; blockrun#848 and its follow-up).
//
// Bare spellings the gateway also accepts. A free id whose bare name belongs
// to a PAID model must be listed here and excluded, so the paid model wins
// the spelling (MCP FREE_SHADOWED_BY_PAID). Empty since the nvidia DeepSeek
// mirror was retired; bare "deepseek-v4-pro" is the paid
// deepseek/deepseek-v4-pro ($1.32/$3.96) and is not in the free set at all.
const FREE_SHADOWED_BY_PAID = new Set([]);
const FREE_CHAT_BARE = new Set(
  [...FREE_CHAT_MODELS].filter((id) => !FREE_SHADOWED_BY_PAID.has(id)).map((id) => id.slice(id.indexOf("/") + 1)),
);
function isFreeChatModel(model) {
  const id = String(model || "").trim();
  return FREE_CHAT_MODELS.has(id) || (!id.includes("/") && FREE_CHAT_BARE.has(id));
}

// Whether `size` is in `model`'s large tier (see IMAGE_LARGE_THRESHOLD /
// IMAGE_LARGE_MIN_DIM). Unparseable sizes price at the base.
function isLargerThanBase(model, size) {
  const m = /^\s*(\d+)\s*[x×]\s*(\d+)\s*$/i.exec(size || "");
  if (!m) return false;
  const threshold = IMAGE_LARGE_THRESHOLD[model] ?? 1024;
  const pick = IMAGE_LARGE_MIN_DIM.has(model) ? Math.min : Math.max;
  return pick(Number(m[1]), Number(m[2])) > threshold;
}

// Map a full MCP tool name (mcp__<server>__blockrun_<tool>) to the bare tool.
function bareTool(toolName) {
  const m = /blockrun_([a-z]+)$/.exec(toolName || "");
  return m ? m[1] : null;
}

function estimate(toolName, input = {}) {
  const tool = bareTool(toolName);
  switch (tool) {
    case "image": {
      const model = input.model || "openai/gpt-image-2";
      let usd = IMAGE[model] ?? IMAGE_DEFAULT;
      if (IMAGE_LARGE[model] && isLargerThanBase(model, input.size)) usd = IMAGE_LARGE[model];
      return { usd, label: `image · ${model}` };
    }
    case "video": {
      const model = input.model || "xai/grok-imagine-video";
      const hasImage = Boolean(input.image_url || input.real_face_asset_id);
      const res = input.resolution;
      let rate = VIDEO_RATE[model] ?? VIDEO_DEFAULT_RATE;
      if (res && VIDEO_RATE_BY_RES[model]?.[res]) rate = VIDEO_RATE_BY_RES[model][res];
      else if (res && model.startsWith("bytedance/seedance-") && SEEDANCE_RES_FACTOR[res]) rate *= SEEDANCE_RES_FACTOR[res];
      const secs = Number(input.duration_seconds) || VIDEO_DEFAULT_SECS[model] || 8;
      return { usd: rate * secs, label: `video · ${model} · ${secs}s${res ? ` · ${res}` : ""}${hasImage ? " (i2v)" : ""}` };
    }
    case "music":
      return { usd: MUSIC_COST, label: `music · ${input.model || "minimax/music-2.5+"}` };
    case "speech": {
      const action = input.action || "speak";
      if (action === "voices") return { usd: 0, label: "speech · list voices (free)" };
      if (action === "sound_effect") return { usd: SOUND_EFFECT_COST, label: "speech · sound effect" };
      const model = input.model || "elevenlabs/flash-v2.5";
      const rate = SPEECH_RATE[model] ?? SPEECH_DEFAULT_RATE;
      const chars = (input.input || "").length || 100;
      return { usd: Math.max(0.001, (chars / 1000) * rate), label: `speech · ${model} · ${chars} chars` };
    }
    case "realface": {
      const action = input.action || "list";
      const paid = action === "enroll" || action === "portrait";
      return { usd: paid ? 0.01 : 0, label: `realface · ${action}${paid ? "" : " (free)"}` };
    }
    case "price": {
      const cat = input.category;
      const paid = input.action !== "list" && (cat === "stocks" || cat === "usstock");
      return { usd: paid ? 0.001 : 0, label: `price · ${cat || "crypto"}${paid ? "" : " (free)"}` };
    }
    case "chat": {
      // An explicit model wins over mode, as in the MCP: mode is ignored when
      // model is set.
      const free = input.model ? isFreeChatModel(input.model) : input.mode === "free";
      return { usd: free ? 0 : 0.005, label: `chat${free ? " (free tier)" : ""}` };
    }
    // Wallet + models are always free; data tools (if a fuller profile is used)
    // are sub-cent — treat as free for gating purposes.
    case "wallet":
    case "models":
      return { usd: 0, label: `${tool} (free)` };
    default:
      // Unknown blockrun tool: treat as a small paid call so it still confirms.
      return { usd: tool ? 0.005 : 0, label: tool || "non-blockrun" };
  }
}

// Savings vs the flagship image model, for the "you saved $X" narrative.
const IMAGE_FLAGSHIP = 0.06; // openai/gpt-image-2 base
function savings(toolName, input = {}) {
  const m = /blockrun_([a-z]+)$/.exec(toolName || "");
  if (!m || m[1] !== "image") return 0;
  const model = input.model || "openai/gpt-image-2";
  const chosen = IMAGE[model] ?? IMAGE_DEFAULT;
  const saved = IMAGE_FLAGSHIP - chosen;
  return saved > 0 ? saved : 0;
}

module.exports = { estimate, savings };
