import { NextRequest } from "next/server";
import { jsonError, jsonOk, parseContentType } from "@/lib/backend/api";
import { applySessionCookie, getSession } from "@/lib/backend/session";
import { listContent } from "@/lib/backend/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = getSession(request);

  try {
    const typeParam = request.nextUrl.searchParams.get("type") || "all";
    const type = typeParam === "all" ? "all" : parseContentType(typeParam);
    const search = request.nextUrl.searchParams.get("search") || "";
    const page = clampNumber(request.nextUrl.searchParams.get("page"), 1, 999, 1);
    const limit = clampNumber(request.nextUrl.searchParams.get("limit"), 1, 48, 12);

    const result = await listContent({ sessionId: session.sessionId, type, search, page, limit });
    return applySessionCookie(jsonOk({ ...result }), session);
  } catch (error) {
    return applySessionCookie(jsonError(error), session);
  }
}

function clampNumber(value: string | null, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
