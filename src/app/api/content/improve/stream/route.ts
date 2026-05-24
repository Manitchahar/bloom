import { NextRequest } from "next/server";
import { ApiError, enforceRateLimit, jsonError, optionalString, parseImprovementGoal, readJson, requiredString } from "@/lib/backend/api";
import { getSession, sessionCookieHeader } from "@/lib/backend/session";
import { improveTextStream } from "@/lib/backend/ai/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getSession(request);

  try {
    enforceRateLimit(session.sessionId, "improve-stream", 10);

    const body = await readJson(request);
    const content = requiredString(body.content, "content", 12000);
    const goal = parseImprovementGoal(body.goal);
    const audience = optionalString(body.audience, 300);
    const brandVoice = optionalString(body.brandVoice, 1000);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        try {
          send({ type: "start" });

          const result = await improveTextStream({ content, goal, audience, brandVoice }, (delta) => {
            send({ type: "delta", delta });
          });

          send({ type: "done", ...result });
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
