import { NextRequest } from "next/server";
import { ApiError, enforceRateLimit, jsonError, jsonOk, optionalString, parseContentType, readJson, requiredString } from "@/lib/backend/api";
import { applySessionCookie, getSession } from "@/lib/backend/session";
import { createContent } from "@/lib/backend/storage";
import type { ContentRecord } from "@/lib/backend/types";
import { createContentId, generateText, makeExcerpt, makeTitle } from "@/lib/backend/ai/text";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = getSession(request);

  try {
    enforceRateLimit(session.sessionId, "generate", 8);

    const body = await readJson(request);
    const topic = requiredString(body.topic, "topic", 300);
    const audience = requiredString(body.audience, "audience", 300);
    const tone = requiredString(body.tone, "tone", 120);
    const contentType = parseContentType(body.contentType);
    const brandVoice = optionalString(body.brandVoice, 1000);

    const generated = await generateText({ topic, audience, tone, contentType, brandVoice });
    const now = new Date().toISOString();
    const record: ContentRecord = {
      id: createContentId(),
      sessionId: session.sessionId,
      topic,
      audience,
      tone,
      contentType,
      title: makeTitle(generated.content, topic),
      excerpt: makeExcerpt(generated.content),
      content: generated.content,
      provider: generated.provider,
      images: [],
      createdAt: now,
      updatedAt: now,
    };

    await createContent(record);
    return applySessionCookie(jsonOk({ item: record, provider: generated.provider }), session);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error(error);
    }
    return applySessionCookie(jsonError(error), session);
  }
}
