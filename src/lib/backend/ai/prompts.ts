import type { ContentRecord, ContentType, ImageStyle, ImprovementGoal } from "../types";

export interface TextPromptInput {
  topic: string;
  audience: string;
  tone: string;
  contentType: ContentType;
  brandVoice?: string;
}

export interface ImprovePromptInput {
  content: string;
  goal: ImprovementGoal;
  audience?: string;
  brandVoice?: string;
}

export const CONTENT_PROMPT_CONFIG: Record<ContentType, { strategy: string; maxTokens: number; maxWords: number; minWords: number }> = {
  blog: {
    strategy: "Write a polished blog post with a clear hook, 3 short plain-text section headings, practical examples, and a memorable close. Keep it under 650 words.",
    maxTokens: 950,
    maxWords: 650,
    minWords: 180,
  },
  linkedin: {
    strategy: "Write a concise LinkedIn post with short paragraphs, a strong point of view, practical lessons, and one engagement question. Keep it under 170 words.",
    maxTokens: 360,
    maxWords: 170,
    minWords: 45,
  },
  ad: {
    strategy: "Write conversion-focused ad copy with a memorable opening, concise benefit language, and a clear call to action. Keep it under 80 words.",
    maxTokens: 180,
    maxWords: 80,
    minWords: 18,
  },
  email: {
    strategy: "Write a warm newsletter email with a subject line, greeting, concise body, useful bullets, and a friendly sign-off. Keep it under 280 words.",
    maxTokens: 520,
    maxWords: 280,
    minWords: 80,
  },
};

export const IMPROVEMENT_PROMPTS: Record<ImprovementGoal, string> = {
  shorter: "Rewrite the content to be 25-40% shorter while preserving the core message and strongest details. Remove filler, repeated claims, and soft setup.",
  persuasive: "Rewrite the content to be more persuasive with a sharper benefit, clearer stakes, concrete proof, and a stronger call to action.",
  formal: "Rewrite the content in a polished professional register with clearer structure, precise wording, and no casual phrasing.",
  seo: "Rewrite the content as search-friendly copy. Add a useful plain-text headline, natural keyword phrasing, stronger structure, and scan-friendly wording. Return only the rewritten copy and a one-sentence explanation. Do not mention scores, grades, reports, metadata, brackets, or keyword analysis.",
  audience: "Rewrite the content for the specified audience with visibly different vocabulary, examples, objections, and framing while keeping the original intent.",
};

export const STYLE_PROMPTS: Record<ImageStyle, string> = {
  photographic: "photographic editorial marketing image, natural light, premium composition",
  illustration: "warm editorial illustration, soft organic forms, refined SaaS brand aesthetic",
  "3d": "polished 3D render, tactile materials, soft shadows, modern marketing visual",
  minimalist: "minimalist premium composition, restrained palette, elegant negative space",
  abstract: "abstract campaign visual, expressive shapes, layered depth, sophisticated color balance",
};

export const STYLE_GRADIENTS: Record<ImageStyle, [string, string, string]> = {
  photographic: ["#6b9a62", "#efe7d7", "#d47a55"],
  illustration: ["#4a7a42", "#fff8f0", "#8d76a5"],
  "3d": ["#dfeadd", "#f6eee3", "#c86f4b"],
  minimalist: ["#1a2518", "#6b9a62", "#fff8f0"],
  abstract: ["#7e6a9a", "#d47a55", "#4a7a42"],
};

export const BANNED_MARKETING_PHRASES = [
  "unlock your potential",
  "revolutionize",
  "game-changing",
  "in today's fast-paced world",
  "future of",
  "seamless",
  "elevate",
  "leverage",
  "cutting-edge",
  "unleash",
];

export function buildGenerationPrompt(input: TextPromptInput) {
  return [
    "You are Bloom, an AI content marketing assistant for polished SaaS marketing teams.",
    CONTENT_PROMPT_CONFIG[input.contentType].strategy,
    plainTextRules(),
    qualityRubric(),
    "",
    `Topic: ${input.topic}`,
    `Audience: ${input.audience}`,
    `Tone: ${input.tone}`,
    `Content type: ${input.contentType}`,
    input.brandVoice ? `Brand voice: ${input.brandVoice}` : "",
  ].filter(Boolean).join("\n");
}

export function buildImprovementPrompt(input: ImprovePromptInput) {
  return [
    "You are Bloom, an expert content editor.",
    IMPROVEMENT_PROMPTS[input.goal],
    "Make a meaningful edit. Do not return the original with a small suffix.",
    "Quality checks before you answer: the result must not contain SEO scores, readability grades, keyword reports, JSON commentary, Markdown syntax, or analysis blocks.",
    "Return strict JSON with keys improved and explanation. The improved value must be plain text, not Markdown. The explanation must be one short sentence.",
    plainTextRules(),
    "",
    input.audience ? `Target audience: ${input.audience}` : "",
    input.brandVoice ? `Brand voice: ${input.brandVoice}` : "",
    "Original content:",
    input.content,
  ].filter(Boolean).join("\n");
}

export function buildImprovementRetryPrompt(input: ImprovePromptInput, previousDraft: string, failures: string[]) {
  return [
    "Your previous edit failed Bloom's quality checks.",
    `Failed checks: ${failures.join("; ")}`,
    "Rewrite again from scratch. Do not patch the previous draft.",
    buildImprovementPrompt(input),
    "",
    "Previous failed draft:",
    previousDraft,
  ].join("\n");
}

export function buildImagePrompt({ record, style, regenerate }: { record: ContentRecord; style: ImageStyle; regenerate: boolean }) {
  const excerpt = record.content.replace(/\s+/g, " ").slice(0, 500);
  return [
    `Create a ${STYLE_PROMPTS[style]} for a ${record.contentType} marketing asset.`,
    `Topic: ${record.topic}.`,
    `Audience: ${record.audience}.`,
    `Tone: ${record.tone}.`,
    `Content excerpt: ${excerpt}`,
    regenerate ? "Create a fresh alternative composition from previous versions while preserving the same marketing concept." : "",
    "Create a clean editorial or campaign hero image only.",
    "Do not create a screenshot, website, app interface, music player, dashboard, phone screen, browser window, social post mockup, poster with typography, or any image containing readable text.",
    "No letters, words, captions, logos, watermarks, buttons, menus, icons-as-text, UI chrome, cursors, progress bars, timestamps, or media player controls.",
    "Use symbolic objects, natural scenes, abstract shapes, people, workspace details, or product-context metaphors instead of text.",
    "The image should pair naturally with the written content and feel like a polished SaaS marketing deliverable.",
  ].filter(Boolean).join(" ");
}

function plainTextRules() {
  return [
    "Return only user-facing copy.",
    "Use plain text only.",
    "Do not use Markdown syntax.",
    "Do not use **bold**, # headings, backticks, markdown tables, or markdown fences.",
    "For headings, write the heading text on its own line without symbols.",
    "For lists, use simple hyphen bullets only when useful.",
  ].join(" ");
}

function qualityRubric() {
  return [
    "Quality gate, inspired by prompt eval assertions:",
    "The final copy must feel written by a sharp human marketer, not a generic AI assistant.",
    "Must include at least one concrete detail tied to the topic, audience, or workflow.",
    "Must sound specific to the requested audience instead of broadly inspirational.",
    `Must avoid empty phrases such as ${BANNED_MARKETING_PHRASES.join(", ")}.`,
    "Must not mention AI unless the topic itself is about AI.",
    "Must not explain what you are doing.",
    "Silently grade the draft before returning it. If it would fail any rule, revise once and return only the improved final copy.",
  ].join(" ");
}
