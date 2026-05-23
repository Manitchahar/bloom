import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "bloom_session";

export interface SessionState {
  sessionId: string;
  shouldSetCookie: boolean;
}

function secret() {
  return process.env.SESSION_SECRET || "bloom-local-assessment-secret";
}

function sign(sessionId: string) {
  return crypto.createHmac("sha256", secret()).update(sessionId).digest("base64url");
}

function encode(sessionId: string) {
  return `${sessionId}.${sign(sessionId)}`;
}

function decode(token?: string) {
  if (!token) return null;
  const [sessionId, signature] = token.split(".");
  if (!sessionId || !signature) return null;

  const expected = sign(sessionId);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) return null;
  if (!crypto.timingSafeEqual(expectedBuffer, actualBuffer)) return null;
  return sessionId;
}

export function getSession(request: NextRequest): SessionState {
  const existing = decode(request.cookies.get(COOKIE_NAME)?.value);
  if (existing) {
    return { sessionId: existing, shouldSetCookie: false };
  }

  return { sessionId: crypto.randomUUID(), shouldSetCookie: true };
}

export function applySessionCookie(response: NextResponse, session: SessionState) {
  if (!session.shouldSetCookie) return response;

  response.cookies.set(COOKIE_NAME, encode(session.sessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.BLOOM_SECURE_COOKIES === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export function sessionCookieHeader(session: SessionState) {
  if (!session.shouldSetCookie) return null;

  const secure = process.env.BLOOM_SECURE_COOKIES === "true" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encode(session.sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}${secure}`;
}
