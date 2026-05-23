import { NextRequest } from "next/server";
import { ApiError, enforceRateLimit, jsonError, jsonOk, optionalString, parseImprovementGoal, readJson, requiredString } from "@/lib/backend/api";
import { applySessionCookie, getSession } from "@/lib/backend/session";
import { improveText } from "@/lib/backend/ai/text";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = getSession(request);

  try {
    enforceRateLimit(session.sessionId, "improve", 10);

    const body = await readJson(request);
    const content = requiredString(body.content, "content", 12000);
    const goal = parseImprovementGoal(body.goal);
    const audience = optionalString(body.audience, 300);
    const brandVoice = optionalString(body.brandVoice, 1000);

    const result = await improveText({ content, goal, audience, brandVoice });
    return applySessionCookie(jsonOk(result), session);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error(error);
    }
    return applySessionCookie(jsonError(error), session);
  }
}
