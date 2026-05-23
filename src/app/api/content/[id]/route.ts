import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/backend/api";
import { applySessionCookie, getSession } from "@/lib/backend/session";
import { deleteContent, getContent } from "@/lib/backend/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSession(request);

  try {
    const { id } = await context.params;
    const item = await getContent(session.sessionId, id);
    return applySessionCookie(jsonOk({ item }), session);
  } catch (error) {
    return applySessionCookie(jsonError(error), session);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSession(request);

  try {
    const { id } = await context.params;
    await deleteContent(session.sessionId, id);
    return applySessionCookie(jsonOk({ deleted: true }), session);
  } catch (error) {
    return applySessionCookie(jsonError(error), session);
  }
}
