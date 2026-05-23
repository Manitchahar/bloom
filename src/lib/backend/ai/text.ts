import crypto from "node:crypto";
import type { ContentType, ImprovementGoal, ProviderName } from "../types";
import { BANNED_MARKETING_PHRASES, CONTENT_PROMPT_CONFIG, buildGenerationPrompt, buildImprovementPrompt, buildImprovementRetryPrompt } from "./prompts";

interface GenerateInput {
  topic: string;
  audience: string;
  tone: string;
  contentType: ContentType;
  brandVoice?: string;
}

interface ImproveInput {
  content: string;
  goal: ImprovementGoal;
  audience?: string;
  brandVoice?: string;
}

export interface TextGenerationResult {
  content: string;
  provider: ProviderName;
}

export interface ImprovementResult {
  improved: string;
  explanation: string;
  provider: ProviderName;
}

export function makeTitle(content: string, topic: string) {
  const firstLine = content.split("\n").map((line) => line.trim()).find(Boolean);
  const clean = (firstLine || topic).replace(/^subject:\s*/i, "").replace(/[*#]/g, "").trim();
  return clean.slice(0, 90) || "Untitled bloom";
}

export function makeExcerpt(content: string) {
  const clean = content.replace(/\s+/g, " ").trim();
  return clean.length > 170 ? `${clean.slice(0, 167)}...` : clean;
}

export async function generateText(input: GenerateInput): Promise<TextGenerationResult> {
  if (!textApiKey()) {
    return mockGenerate(input);
  }

  const prompt = buildGenerationPrompt(input);
  const limits = CONTENT_PROMPT_CONFIG[input.contentType];

  try {
    const raw = await callTextWithRetry(prompt, limits.maxTokens);
    const content = enforceWordLimit(cleanModelContent(raw), limits.maxWords);
    assertMinimumWords(content, limits.minWords, input.contentType);
    return { content, provider: textProviderName() };
  } catch (error) {
    console.error("Text generation provider failed.", error);
    throw new Error("Text generation provider failed.");
  }
}

export async function generateTextStream(input: GenerateInput, onDelta: (delta: string) => void | Promise<void>): Promise<TextGenerationResult> {
  if (!textApiKey()) {
    const generated = mockGenerate(input);
    await emitTextChunks(generated.content, onDelta);
    return generated;
  }

  if (!usesChatCompletions()) {
    const generated = await generateText(input);
    await emitTextChunks(generated.content, onDelta);
    return generated;
  }

  const prompt = buildGenerationPrompt(input);
  const limits = CONTENT_PROMPT_CONFIG[input.contentType];

  try {
    const raw = await callChatCompletionsTextStream(prompt, limits.maxTokens, onDelta);
    const content = enforceWordLimit(cleanModelContent(raw), limits.maxWords);
    assertMinimumWords(content, limits.minWords, input.contentType);
    return { content, provider: textProviderName() };
  } catch (error) {
    console.error("Streaming text provider failed.", error);
    throw new Error("Streaming text provider failed.");
  }
}

export async function improveText(input: ImproveInput): Promise<ImprovementResult> {
  if (!textApiKey()) {
    return mockImprove(input);
  }

  const prompt = buildImprovementPrompt(input);

  try {
    const raw = await callTextWithRetry(prompt);
    let parsed = parseImprovementJson(raw);
    let failures = improvementQualityFailures(input, parsed.improved);

    if (failures.length > 0) {
      const firstResultWasBlocking = blockingImprovementFailure(failures);

      try {
        const retryRaw = await callTextWithRetry(buildImprovementRetryPrompt(input, parsed.improved, failures));
        const retryParsed = parseImprovementJson(retryRaw);
        const retryFailures = improvementQualityFailures(input, retryParsed.improved);

        if (blockingImprovementFailure(retryFailures)) {
          throw new Error(`Improvement failed quality checks: ${retryFailures.join(", ")}`);
        }

        parsed = retryParsed;
        failures = retryFailures;
      } catch (retryError) {
        if (firstResultWasBlocking) {
          throw retryError;
        }
        console.warn("Improvement quality retry failed; using first non-blocking provider result.", retryError);
      }
    }

    if (failures.length > 0) {
      parsed = {
        ...parsed,
        improved: repairWeakImprovement(input, parsed.improved),
      };
      failures = improvementQualityFailures(input, parsed.improved);
    }

    if (blockingImprovementFailure(failures)) {
      throw new Error(`Improvement failed quality checks: ${failures.join(", ")}`);
    }

    return { ...parsed, provider: textProviderName() };
  } catch (error) {
    console.error("Text improvement provider failed.", error);
    throw new Error("Text improvement provider failed.");
  }
}

async function callTextWithRetry(prompt: string, maxTokens = 900) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await callOpenAIText(prompt, maxTokens);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        console.warn(`Text provider attempt ${attempt} failed; retrying.`, error);
        await sleep(350 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Text provider request failed.");
}

async function callOpenAIText(prompt: string, maxTokens = 900) {
  if (usesChatCompletions()) {
    return callChatCompletionsText(prompt, maxTokens);
  }

  const response = await fetch(`${textBaseUrl()}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${textApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: textModel(),
      input: prompt,
      temperature: 0.7,
      max_output_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI text request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const outputText = typeof data.output_text === "string" ? data.output_text : extractOutputText(data);
  if (!outputText) {
    throw new Error("OpenAI text response did not include text output.");
  }

  return outputText.trim();
}

async function callChatCompletionsText(prompt: string, maxTokens: number) {
  const body = buildChatCompletionsBody(prompt, maxTokens);

  const response = await fetch(`${textBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${textApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Text provider request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Text provider response did not include message content.");
  }

  return content.trim();
}

async function callChatCompletionsTextStream(prompt: string, maxTokens: number, onDelta: (delta: string) => void | Promise<void>) {
  const body = buildChatCompletionsBody(prompt, maxTokens, true);

  const response = await fetch(`${textBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${textApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Text provider stream request failed: ${response.status} ${text}`);
  }

  if (!response.body) {
    throw new Error("Text provider stream response did not include a body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        await onDelta(delta);
      }
    }
  }

  if (!fullText.trim()) {
    throw new Error("Text provider stream did not include content.");
  }

  return fullText.trim();
}

function buildChatCompletionsBody(prompt: string, maxTokens: number, stream = false) {
  const body: Record<string, unknown> = {
    model: textModel(),
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.65,
  };

  if (textProviderName() === "xiaomi") {
    body.max_completion_tokens = maxTokens;
  } else {
    body.max_tokens = maxTokens;
  }

  if (stream) {
    body.stream = true;
  }

  const reasoningEffort = process.env.AI_TEXT_REASONING_EFFORT;
  if (reasoningEffort) {
    body.reasoning_effort = reasoningEffort;
  }

  if (process.env.AI_TEXT_DISABLE_THINKING === "true") {
    if (textProviderName() === "xiaomi") {
      body.thinking = { type: "disabled" };
    } else {
      body.chat_template_kwargs = { enable_thinking: false };
    }
  }

  return body;
}

function textApiKey() {
  return process.env.AI_TEXT_API_KEY || process.env.OPENAI_API_KEY || "";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function emitTextChunks(content: string, onDelta: (delta: string) => void | Promise<void>) {
  const chunkSize = 28;
  for (let index = 0; index < content.length; index += chunkSize) {
    await onDelta(content.slice(index, index + chunkSize));
  }
}

function textBaseUrl() {
  return (process.env.AI_TEXT_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
}

function textModel() {
  if (process.env.AI_TEXT_MODEL) return process.env.AI_TEXT_MODEL;
  if (process.env.OPENAI_TEXT_MODEL) return process.env.OPENAI_TEXT_MODEL;
  return usesChatCompletions() ? "mimo-v2.5" : "gpt-4.1-mini";
}

function usesChatCompletions() {
  return Boolean(process.env.AI_TEXT_BASE_URL || process.env.OPENAI_BASE_URL);
}

function textProviderName(): ProviderName {
  const baseUrl = textBaseUrl();
  if (baseUrl.includes("xiaomimimo.com")) return "xiaomi";
  if (baseUrl.includes("api.openai.com")) return "openai";
  return "custom";
}

function extractOutputText(data: { output?: Array<{ content?: Array<{ text?: string; type?: string }> }> }) {
  return data.output
    ?.flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
}

function parseImprovementJson(raw: string) {
  const normalized = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = parseJsonObject(normalized);
  if (parsed) {
    const improved = getCaseInsensitiveString(parsed, "improved");
    const explanation = getCaseInsensitiveString(parsed, "explanation");

    if (improved) {
      return {
        improved: sanitizeImprovementContent(improved),
        explanation: cleanModelContent(explanation || "The content was refined for the selected goal."),
      };
    }
  }

  const improvedField = extractJsonStringField(normalized, "improved");
  if (improvedField) {
    return {
      improved: sanitizeImprovementContent(improvedField),
      explanation: cleanModelContent(extractJsonStringField(normalized, "explanation") || "The content was refined for the selected goal."),
    };
  }

  return {
    improved: sanitizeImprovementContent(normalized),
    explanation: "The content was refined for the selected goal.",
  };
}

function getCaseInsensitiveString(record: Record<string, unknown>, key: string) {
  const match = Object.entries(record).find(([entryKey]) => entryKey.toLowerCase() === key.toLowerCase());
  return typeof match?.[1] === "string" ? match[1] : "";
}

function parseJsonObject(value: string) {
  const candidates = [value];
  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(value.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function extractJsonStringField(value: string, field: string) {
  const pattern = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i");
  const match = value.match(pattern);
  if (!match?.[1]) return "";

  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }
}

function improvementQualityFailures(input: ImproveInput, improved: string) {
  const failures: string[] = [];
  const originalWords = wordCount(input.content);
  const improvedWords = wordCount(improved);
  const originalNormalized = normalizeForComparison(input.content);
  const improvedNormalized = normalizeForComparison(improved);

  if (!improvedNormalized) {
    failures.push("hard: empty output");
  }

  if (/\b(SEO Score|Readability:\s*Grade|Keywords naturally integrated|keyword report|metadata block)\b/i.test(improved)) {
    failures.push("hard: fake SEO metric or report block");
  }

  if (/```|^\s{0,3}#{1,6}\s+|\*\*|__|\{[\s\S]*"improved"[\s\S]*\}/m.test(improved)) {
    failures.push("hard: markdown or raw JSON artifact");
  }

  if (originalNormalized === improvedNormalized) {
    failures.push("hard: unchanged output");
  }

  if (originalWords >= 20 && similarityScore(input.content, improved) > 0.92 && Math.abs(improvedWords - originalWords) <= Math.ceil(originalWords * 0.12)) {
    failures.push("hard: too similar to original");
  }

  if (input.goal === "shorter" && originalWords >= 35 && improvedWords > Math.ceil(originalWords * 0.85)) {
    failures.push("soft: shorter goal did not reduce enough");
  }

  if (input.goal === "seo" && /score|grade|keywords?:/i.test(improved)) {
    failures.push("hard: SEO output contains analysis instead of copy");
  }

  if (input.goal === "audience" && input.audience && !mentionsAudienceSignal(improved, input.audience)) {
    failures.push("soft: audience framing is not visible");
  }

  return failures;
}

function blockingImprovementFailure(failures: string[]) {
  return failures.some((failure) => failure === "hard: empty output");
}

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function normalizeForComparison(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function similarityScore(a: string, b: string) {
  const aTokens = new Set(normalizeForComparison(a).split(/\s+/).filter((token) => token.length > 2));
  const bTokens = new Set(normalizeForComparison(b).split(/\s+/).filter((token) => token.length > 2));
  if (!aTokens.size || !bTokens.size) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }

  return overlap / Math.min(aTokens.size, bTokens.size);
}

function mentionsAudienceSignal(content: string, audience: string) {
  const contentTokens = new Set(normalizeForComparison(content).split(/\s+/).filter((token) => token.length > 3));
  return normalizeForComparison(audience).split(/\s+/).some((token) => token.length > 3 && contentTokens.has(token));
}

function sanitizeImprovementContent(content: string) {
  return cleanModelContent(content)
    .split(/\r?\n/)
    .filter((line) => !/\b(SEO Score|Readability:\s*Grade|Keywords naturally integrated|keyword report|metadata block)\b/i.test(line))
    .filter((line) => !/^\s*\[[^\]]*(keywords?|readability|score|grade)[^\]]*\]\s*$/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function repairWeakImprovement(input: ImproveInput, improved: string) {
  const cleaned = sanitizeImprovementContent(improved);
  if (!cleaned) return cleaned;

  const tooSimilar = normalizeForComparison(cleaned) === normalizeForComparison(input.content) || similarityScore(input.content, cleaned) > 0.94;
  if (!tooSimilar && input.goal !== "seo") return cleaned;

  if (input.goal === "shorter") {
    return shortenCopy(cleaned || input.content);
  }

  if (input.goal === "seo") {
    const base = cleaned || input.content;
    const firstLine = base.split("\n").map((line) => line.trim()).find(Boolean) || "Clearer content refinement";
    return [
      `${firstLine.replace(/[.:]+$/, "")} for faster content approvals`,
      "",
      base,
    ].join("\n").trim();
  }

  if (input.goal === "persuasive") {
    return [
      "Turn rough drafts into copy your team can approve faster.",
      "",
      cleaned,
      "",
      "Use the refined version to clarify the message, reduce review cycles, and publish with more confidence.",
    ].join("\n").trim();
  }

  if (input.goal === "audience" && input.audience) {
    return [`For ${input.audience}:`, "", cleaned].join("\n").trim();
  }

  return cleaned;
}

function shortenCopy(content: string) {
  const sentences = content.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 1) {
    return sentences.filter((_, index) => index % 2 === 0).join(" ").replace(/\s+/g, " ").trim();
  }

  const words = content.split(/\s+/).filter(Boolean);
  return words.slice(0, Math.max(12, Math.ceil(words.length * 0.7))).join(" ").replace(/[,:;]+$/, ".").trim();
}

function mockGenerate(input: GenerateInput): TextGenerationResult {
  const base = fallbackContent(input);
  return {
    content: enforceWordLimit(cleanModelContent(base), CONTENT_PROMPT_CONFIG[input.contentType].maxWords),
    provider: "mock",
  };
}

function fallbackContent(input: GenerateInput) {
  const topic = input.topic || "the campaign";
  const audience = input.audience || "your audience";

  if (input.contentType === "linkedin") {
    return [
      `${topic} gets messy when teams start with channels before decisions.`,
      "",
      `For ${audience}, the useful move is simpler: define the launch promise, the proof points, and the handoff plan before anyone writes the first post.`,
      "",
      "A practical launch checklist:",
      "- One audience segment",
      "- One primary conversion action",
      "- Three proof points sales can defend",
      "- A shared calendar for creative, review, and publish dates",
      "",
      "The best launch plan is not louder. It is easier for the team to execute.",
      "",
      "What is the one launch detail your team always catches too late?",
    ].join("\n");
  }

  if (input.contentType === "ad") {
    return [
      `${topic} without the scramble.`,
      "",
      `Built for ${audience} who need a clearer plan, faster approvals, and campaigns that launch on time.`,
      "",
      "Plan the message. Align the team. Ship the campaign.",
    ].join("\n");
  }

  if (input.contentType === "email") {
    return [
      `Subject: A calmer way to plan ${topic}`,
      "",
      "Hi there,",
      "",
      `If your team serves ${audience}, launch planning can turn chaotic quickly: scattered briefs, late feedback, and messaging that changes after creative is already built.`,
      "",
      "A tighter workflow helps:",
      "- Lock the audience and core promise first",
      "- Capture objections before copy review",
      "- Give every asset one owner and one deadline",
      "",
      "That turns launch week from a scramble into a sequence your team can trust.",
      "",
      "Warmly,",
      "The Bloom Team",
    ].join("\n");
  }

  return [
    `${topic}: a practical launch planning guide`,
    "",
    `For ${audience}, strong launch planning is less about volume and more about sequencing. Teams need a clear promise, a realistic review path, and campaign assets that support the same story.`,
    "",
    "Start with the decision document",
    "Before writing copy, define the audience, the offer, the objections, and the success metric. This gives every channel the same source of truth.",
    "",
    "Build the proof before the polish",
    "Collect customer language, product screenshots, sales notes, and competitive context early. Good creative gets easier when the evidence is already in one place.",
    "",
    "Protect the handoff",
    "Assign owners for copy, design, approvals, publishing, and reporting. A launch plan works when each person knows what they own and when it is due.",
    "",
    "A good launch does not feel frantic. It feels rehearsed.",
  ].join("\n");
}

function cleanModelContent(content: string) {
  const bannedPattern = new RegExp(`\\b(${BANNED_MARKETING_PHRASES.map(escapeRegExp).join("|")})\\b`, "gi");
  return content
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[a-z]*\n?/gi, "").replace(/```/g, ""))
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+\*\*([^*]+)\*\*/gm, "- $1")
    .replace(bannedPattern, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function enforceWordLimit(content: string, maxWords: number) {
  const words = content.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return content;

  const truncated = words.slice(0, maxWords).join(" ");
  const sentenceEnd = Math.max(truncated.lastIndexOf("."), truncated.lastIndexOf("!"), truncated.lastIndexOf("?"));
  if (sentenceEnd > Math.floor(truncated.length * 0.55)) {
    return truncated.slice(0, sentenceEnd + 1).trim();
  }
  return `${truncated.replace(/[,.!?;:]+$/, "")}.`;
}

function assertMinimumWords(content: string, minWords: number, contentType: ContentType) {
  const words = content.split(/\s+/).filter(Boolean);
  if (words.length < minWords) {
    throw new Error(`Text provider returned too little ${contentType} content (${words.length} words).`);
  }
}

function mockImprove(input: ImproveInput): ImprovementResult {
  let improved = input.content;

  if (input.goal === "shorter") {
    improved = `${input.content.split(". ").filter((_, index) => index % 2 === 0).join(". ")}.`;
  } else if (input.goal === "persuasive") {
    improved = `Here's the thing: ${input.content}\n\nDon't wait - take action today.`;
  } else if (input.goal === "formal") {
    improved = input.content.replace(/don't/g, "do not").replace(/can't/g, "cannot").replace(/!/g, ".");
  } else if (input.goal === "seo") {
    const firstLine = input.content.split("\n").map((line) => line.trim()).find(Boolean) || "A clearer content workflow";
    improved = [
      `${firstLine}: clearer content refinement for busy teams`,
      "",
      input.content.replace(/\n{3,}/g, "\n\n").trim(),
      "",
      "Use Bloom to refine existing copy into clearer, more focused content that is easier to scan, easier to approve, and easier to publish.",
    ].join("\n");
  } else {
    improved = `For ${input.audience || "a new audience"}: ${input.content.replace(/\./g, "! ")}`;
  }

  const explanations: Record<ImprovementGoal, string> = {
    shorter: "Trimmed redundancy while preserving the core message.",
    persuasive: "Added urgency, benefit language, and a clearer call to action.",
    formal: "Adjusted wording for a more professional register.",
    seo: "Added a search-focused heading, clearer phrasing, and more scan-friendly structure.",
    audience: "Reframed the message for the requested audience.",
  };

  return { improved, explanation: explanations[input.goal], provider: "mock" };
}

export function createContentId() {
  return crypto.randomUUID();
}
