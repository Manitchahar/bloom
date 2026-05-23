import { NextRequest } from "next/server";
import { ApiError, enforceRateLimit, jsonError, jsonOk, parseImageStyle, readJson } from "@/lib/backend/api";
import { applySessionCookie, getSession } from "@/lib/backend/session";
import { addImageVersion, getContent } from "@/lib/backend/storage";
import { generateImageVersion } from "@/lib/backend/ai/image";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSession(request);

  try {
    enforceRateLimit(session.sessionId, "image", 6);

    const { id } = await context.params;
    const body = await readJson(request);
    const style = parseImageStyle(body.style || "photographic");
    const record = await getContent(session.sessionId, id);
    const image = await generateImageVersion({ record, style, regenerate: false });
    const item = await addImageVersion(session.sessionId, id, image);

    return applySessionCookie(jsonOk({ item, image, provider: image.provider }), session);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error(error);
    }
    return applySessionCookie(jsonError(error), session);
  }
}
