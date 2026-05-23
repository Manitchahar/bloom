import { NextRequest } from "next/server";
import { ApiError, enforceRateLimit, jsonError, optionalString, parseContentType, readJson, requiredString } from "@/lib/backend/api";
import { getSession, sessionCookieHeader } from "@/lib/backend/session";
import { createContent } from "@/lib/backend/storage";
import type { ContentRecord } from "@/lib/backend/types";
import { createContentId, generateTextStream, makeExcerpt, makeTitle } from "@/lib/backend/ai/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getSession(request);

  try {
    enforceRateLimit(session.sessionId, "generate-stream", 8);

    const body = await readJson(request);
    const topic = requiredString(body.topic, "topic", 300);
    const audience = requiredString(body.audience, "audience", 300);
    const tone = requiredString(body.tone, "tone", 120);
    const contentType = parseContentType(body.contentType);
    const brandVoice = optionalString(body.brandVoice, 1000);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        try {
          send({ type: "start" });

          const generated = await generateTextStream({ topic, audience, tone, contentType, brandVoice }, (delta) => {
            send({ type: "delta", delta });
          });

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
          send({ type: "done", item: record, provider: generated.provider });
        } catch (error) {
          console.error(error);
          send({
            type: "error",
            error: {
              code: "internal_error",
              message: "Something went wrong.",
            },
          });
        } finally {
          controller.close();
        }
      },
    });

    const headers = new Headers({
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    });
    const cookie = sessionCookieHeader(session);
    if (cookie) headers.set("Set-Cookie", cookie);

    return new Response(stream, { headers });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error(error);
    }
    return jsonError(error);
  }
}
