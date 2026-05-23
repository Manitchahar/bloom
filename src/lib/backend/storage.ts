import fs from "node:fs/promises";
import path from "node:path";
import { ApiError } from "./api";
import type { ContentRecord, ContentType, ImageVersion, PaginatedContent, UserSettings } from "./types";

interface Store {
  content: ContentRecord[];
  settings: UserSettings[];
}

const storeDir = path.join(process.cwd(), ".bloom-data");
const storePath = path.join(storeDir, "content-store.json");

let writeQueue = Promise.resolve();

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    return normalizeStore(JSON.parse(raw) as Store);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { content: [], settings: [] };
    }
    throw error;
  }
}

function normalizeStore(store: Store): Store {
  return {
    settings: store.settings || [],
    content: store.content.map((item) => ({
      ...item,
      title: cleanStoredText(item.title),
      excerpt: cleanStoredText(item.excerpt),
      content: cleanStoredText(item.content),
    })),
  };
}

function cleanStoredText(value: string) {
  return value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[a-z]*\n?/gi, "").replace(/```/g, ""))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function writeStore(store: Store) {
  await fs.mkdir(storeDir, { recursive: true });
  writeQueue = writeQueue.then(() => fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8"));
  await writeQueue;
}

export async function createContent(record: ContentRecord) {
  const store = await readStore();
  store.content.unshift(record);
  await writeStore(store);
  return record;
}

export async function listContent({
  sessionId,
  type,
  search,
  page,
  limit,
}: {
  sessionId: string;
  type?: ContentType | "all";
  search?: string;
  page: number;
  limit: number;
}): Promise<PaginatedContent> {
  const store = await readStore();
  const normalizedSearch = search?.trim().toLowerCase() || "";

  const filtered = store.content.filter((item) => {
    if (item.sessionId !== sessionId) return false;
    if (type && type !== "all" && item.contentType !== type) return false;
    if (!normalizedSearch) return true;

    return (
      item.title.toLowerCase().includes(normalizedSearch) ||
      item.excerpt.toLowerCase().includes(normalizedSearch) ||
      item.content.toLowerCase().includes(normalizedSearch)
    );
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;

  return {
    items: filtered.slice(start, start + limit),
    page: safePage,
    limit,
    total,
    totalPages,
  };
}

export async function getContent(sessionId: string, id: string) {
  const store = await readStore();
  const record = store.content.find((item) => item.id === id && item.sessionId === sessionId);
  if (!record) {
    throw new ApiError(404, "not_found", "Content item was not found.");
  }
  return record;
}

export async function addImageVersion(sessionId: string, contentId: string, image: ImageVersion) {
  const store = await readStore();
  const index = store.content.findIndex((item) => item.id === contentId && item.sessionId === sessionId);
  if (index === -1) {
    throw new ApiError(404, "not_found", "Content item was not found.");
  }

  const now = new Date().toISOString();
  const record = {
    ...store.content[index],
    images: [...store.content[index].images, image],
    updatedAt: now,
  };

  store.content[index] = record;
  await writeStore(store);
  return record;
}

export async function deleteContent(sessionId: string, id: string) {
  const store = await readStore();
  const next = store.content.filter((item) => !(item.id === id && item.sessionId === sessionId));
  if (next.length === store.content.length) {
    throw new ApiError(404, "not_found", "Content item was not found.");
  }

  store.content = next;
  await writeStore(store);
}

export async function getSettings(sessionId: string) {
  const store = await readStore();
  return store.settings.find((item) => item.sessionId === sessionId) || defaultSettings(sessionId);
}

export async function updateSettings(sessionId: string, updates: Partial<Omit<UserSettings, "sessionId" | "updatedAt">>) {
  const store = await readStore();
  const current = store.settings.find((item) => item.sessionId === sessionId) || defaultSettings(sessionId);
  const next: UserSettings = {
    ...current,
    ...updates,
    sessionId,
    updatedAt: new Date().toISOString(),
  };

  const index = store.settings.findIndex((item) => item.sessionId === sessionId);
  if (index === -1) {
    store.settings.push(next);
  } else {
    store.settings[index] = next;
  }

  await writeStore(store);
  return next;
}

function defaultSettings(sessionId: string): UserSettings {
  return {
    sessionId,
    defaultTone: "Professional",
    defaultContentType: "blog",
    brandName: "",
    brandIndustry: "",
    brandVoice: "",
    updatedAt: new Date().toISOString(),
  };
}
