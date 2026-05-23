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

export async function generateContentStream(
  input: {
    topic: string;
    audience: string;
    tone: string;
    contentType: ContentType;
    brandVoice?: string;
  },
  onDelta: (delta: string) => void
) {
  const response = await fetch("/api/content/generate/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json();
    const failure = data as ApiFailure;
    throw new Error(failure.error?.message || "Request failed.");
  }

  if (!response.body) {
    throw new Error("Streaming response was not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as
        | { type: "start" }
        | { type: "delta"; delta: string }
        | { type: "done"; item: ContentRecord; provider: ProviderName }
        | { type: "error"; error: ApiFailure["error"] };

      if (event.type === "delta") {
        onDelta(event.delta);
      }

      if (event.type === "done") {
        return { success: true as const, item: event.item, provider: event.provider };
      }

      if (event.type === "error") {
        throw new Error(event.error.message);
      }
    }
  }

  throw new Error("Streaming response ended before content was saved.");
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
