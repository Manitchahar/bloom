import crypto from "node:crypto";
import type { ContentRecord, ImageStyle, ImageVersion, ProviderName } from "../types";
import { STYLE_GRADIENTS, buildImagePrompt } from "./prompts";

export async function generateImageVersion({
  record,
  style,
  regenerate,
}: {
  record: ContentRecord;
  style: ImageStyle;
  regenerate: boolean;
}): Promise<ImageVersion> {
  const prompt = buildImagePrompt({ record, style, regenerate });
  const version = record.images.length + 1;

  const googleKey = process.env.GOOGLE_AI_API_KEY;
  let generated: { imageUrl: string; provider: ProviderName };

  if (googleKey) {
    generated = await callNanoBananaPro(prompt, googleKey);
  } else {
    generated = { imageUrl: mockImageDataUrl(style, record.topic, version), provider: "mock" };
  }

  return {
    id: crypto.randomUUID(),
    contentId: record.id,
    style,
    prompt,
    imageUrl: generated.imageUrl,
    provider: generated.provider,
    version,
    createdAt: new Date().toISOString(),
  };
}

// --- Google AI: Imagen 4 Generate (best quality-per-dollar at $0.04/image) ---

async function callNanoBananaPro(prompt: string, apiKey: string): Promise<{ imageUrl: string; provider: ProviderName }> {
  const model = process.env.IMAGE_MODEL || "imagen-4.0-generate-001";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "16:9" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Imagen 4 image request failed (${model}): ${response.status} ${text}`);
  }

  const data = await response.json();
  const predictions = data.predictions || [];
  if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
    const b64 = predictions[0].bytesBase64Encoded;
    const mime = predictions[0].mimeType || "image/png";
    return { imageUrl: `data:${mime};base64,${b64}`, provider: "google" };
  }

  throw new Error(`Imagen 4 (${model}) response did not include image data.`);
}

// --- Mock fallback ---

function mockImageDataUrl(style: ImageStyle, topic: string, version: number) {
  const [a, b, c] = STYLE_GRADIENTS[style];
  const safeTopic = escapeXml(topic.slice(0, 48) || "Bloom visual");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="0.52" stop-color="${b}"/>
      <stop offset="1" stop-color="${c}"/>
    </linearGradient>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.12"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="1280" height="800" fill="url(#g)"/>
  <rect width="1280" height="800" filter="url(#noise)" opacity="0.32"/>
  <circle cx="${260 + version * 23}" cy="245" r="170" fill="#fff8f0" opacity="0.42"/>
  <circle cx="940" cy="${470 - version * 19}" r="220" fill="#1a2518" opacity="0.16"/>
  <path d="M160 610 C360 430 520 705 720 520 S1030 380 1140 570" fill="none" stroke="#fff8f0" stroke-width="34" opacity="0.38" stroke-linecap="round"/>
  <text x="90" y="690" fill="#1a2518" opacity="0.55" font-family="Arial, sans-serif" font-size="38" font-weight="700">${safeTopic}</text>
</svg>`.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
