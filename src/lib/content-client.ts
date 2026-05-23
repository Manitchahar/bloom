import type { ContentRecord, ContentType, ImageStyle, ImprovementGoal, PaginatedContent, ProviderName, UserSettings } from "@/lib/backend/types";

export type { ContentRecord, ContentType, ImageStyle, ImprovementGoal, ProviderName, UserSettings };

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    const failure = data as ApiFailure;
    throw new Error(failure.error?.message || "Request failed.");
  }

  return data as T;
}

export function generateContent(input: {
  topic: string;
  audience: string;
  tone: string;
  contentType: ContentType;
  brandVoice?: string;
}) {
  return requestJson<{ success: true; item: ContentRecord; provider: ProviderName }>("/api/content/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function improveContent(input: {
  content: string;
  goal: ImprovementGoal;
  audience?: string;
  brandVoice?: string;
}) {
  return requestJson<{ success: true; improved: string; explanation: string; provider: ProviderName }>("/api/content/improve", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listContent(params: { type?: string; search?: string; page?: number; limit?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set("type", params.type);
  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return requestJson<{ success: true } & PaginatedContent>(`/api/content${query ? `?${query}` : ""}`);
}

export function getContent(id: string) {
  return requestJson<{ success: true; item: ContentRecord }>(`/api/content/${id}`);
}

export function deleteContent(id: string) {
  return requestJson<{ success: true; deleted: true }>(`/api/content/${id}`, {
    method: "DELETE",
  });
}

export function generateImage(contentId: string, style: ImageStyle, regenerate = false) {
  return requestJson<{ success: true; item: ContentRecord; image: ContentRecord["images"][number]; provider: ProviderName }>(
    `/api/content/${contentId}/image${regenerate ? "/regenerate" : ""}`,
    {
      method: "POST",
      body: JSON.stringify({ style }),
    }
  );
}

export function getSettings() {
  return requestJson<{ success: true; settings: UserSettings }>("/api/settings");
}

export function updateSettings(updates: Partial<Omit<UserSettings, "sessionId" | "updatedAt">>) {
  return requestJson<{ success: true; settings: UserSettings }>("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}
