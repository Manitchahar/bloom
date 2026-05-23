import { NextResponse } from "next/server";
import { contentTypes, imageStyles, improvementGoals, type ContentType, type ImageStyle, type ImprovementGoal } from "./types";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, ...data }, init);
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status }
    );
  }

  console.error(error);
  return NextResponse.json(
    { success: false, error: { code: "internal_error", message: "Something went wrong." } },
    { status: 500 }
  );
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

export function requiredString(value: unknown, field: string, max = 4000) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, "validation_error", `${field} is required.`);
  }

  const normalized = value.trim();
  if (normalized.length > max) {
    throw new ApiError(400, "validation_error", `${field} is too long.`);
  }

  return normalized;
}

export function optionalString(value: unknown, max = 4000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function parseContentType(value: unknown): ContentType {
  if (typeof value === "string" && contentTypes.includes(value as ContentType)) {
    return value as ContentType;
  }
  throw new ApiError(400, "validation_error", "contentType must be blog, linkedin, ad, or email.");
}

export function parseImprovementGoal(value: unknown): ImprovementGoal {
  if (typeof value === "string" && improvementGoals.includes(value as ImprovementGoal)) {
    return value as ImprovementGoal;
  }
  throw new ApiError(400, "validation_error", "goal must be shorter, persuasive, formal, seo, or audience.");
}

export function parseImageStyle(value: unknown): ImageStyle {
  if (typeof value === "string" && imageStyles.includes(value as ImageStyle)) {
    return value as ImageStyle;
  }
  throw new ApiError(400, "validation_error", "style must be photographic, illustration, 3d, minimalist, or abstract.");
}

const buckets = new Map<string, number[]>();

export function enforceRateLimit(sessionId: string, action: string, maxRequests = 8, windowMs = 60_000) {
  const key = `${sessionId}:${action}`;
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= maxRequests) {
    throw new ApiError(429, "rate_limited", "Please wait a moment before generating again.");
  }

  recent.push(now);
  buckets.set(key, recent);
}
