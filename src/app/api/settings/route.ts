import { NextRequest } from "next/server";
import { jsonError, jsonOk, optionalString, parseContentType, readJson } from "@/lib/backend/api";
import { applySessionCookie, getSession } from "@/lib/backend/session";
import { getSettings, updateSettings } from "@/lib/backend/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = getSession(request);

  try {
    const settings = await getSettings(session.sessionId);
    return applySessionCookie(jsonOk({ settings }), session);
  } catch (error) {
    return applySessionCookie(jsonError(error), session);
  }
}

export async function PATCH(request: NextRequest) {
  const session = getSession(request);

  try {
    const body = await readJson(request);
    const updates = {
      defaultTone: typeof body.defaultTone === "string" && body.defaultTone.trim() ? optionalString(body.defaultTone, 120) : undefined,
      defaultContentType: body.defaultContentType ? parseContentType(body.defaultContentType) : undefined,
      brandName: typeof body.brandName === "string" ? optionalString(body.brandName, 160) : undefined,
      brandIndustry: typeof body.brandIndustry === "string" ? optionalString(body.brandIndustry, 160) : undefined,
      brandVoice: typeof body.brandVoice === "string" ? optionalString(body.brandVoice, 1200) : undefined,
    };

    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));
    const settings = await updateSettings(session.sessionId, cleanUpdates);
    return applySessionCookie(jsonOk({ settings }), session);
  } catch (error) {
    return applySessionCookie(jsonError(error), session);
  }
}
