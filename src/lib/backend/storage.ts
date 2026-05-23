import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { ApiError } from "./api";
import type { ContentRecord, ContentType, ImageVersion, PaginatedContent, UserSettings } from "./types";

interface Store {
  content: ContentRecord[];
  settings: UserSettings[];
}

const storeDir = path.join(process.cwd(), ".bloom-data");
const storePath = path.join(storeDir, "content-store.json");

let writeQueue = Promise.resolve();
let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  }

  return pool;
}

async function ensureSchema() {
  if (!hasDatabase()) return;
  if (!schemaReady) {
    schemaReady = getPool().query(`
      create table if not exists content_records (
        id text primary key,
        session_id text not null,
        topic text not null,
        audience text not null,
        tone text not null,
        content_type text not null,
        title text not null,
        excerpt text not null,
        content text not null,
        provider text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      );

      create table if not exists image_versions (
        id text primary key,
        content_id text not null references content_records(id) on delete cascade,
        style text not null,
        prompt text not null,
        image_url text not null,
        provider text not null,
        version integer not null,
        created_at timestamptz not null
      );

      create table if not exists user_settings (
        session_id text primary key,
        default_tone text not null,
        default_content_type text not null,
        brand_name text not null,
        brand_industry text not null,
        brand_voice text not null,
        updated_at timestamptz not null
      );

      create index if not exists content_records_session_updated_idx
        on content_records(session_id, updated_at desc);
      create index if not exists image_versions_content_version_idx
        on image_versions(content_id, version asc);
    `).then(() => undefined);
  }

  await schemaReady;
}

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
  if (hasDatabase()) {
    await ensureSchema();
    await getPool().query(
      `insert into content_records (
        id, session_id, topic, audience, tone, content_type, title, excerpt, content, provider, created_at, updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        record.id,
        record.sessionId,
        record.topic,
        record.audience,
        record.tone,
        record.contentType,
        record.title,
        record.excerpt,
        record.content,
        record.provider,
        record.createdAt,
        record.updatedAt,
      ]
    );
    return record;
  }

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
  if (hasDatabase()) {
    await ensureSchema();

    const normalizedSearch = search?.trim() || "";
    const safePage = Math.max(1, page);
    const filters = ["c.session_id = $1"];
    const values: unknown[] = [sessionId];

    if (type && type !== "all") {
      values.push(type);
      filters.push(`c.content_type = $${values.length}`);
    }

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      filters.push(`(c.title ilike $${values.length} or c.excerpt ilike $${values.length} or c.content ilike $${values.length})`);
    }

    const where = filters.join(" and ");
    const totalResult = await getPool().query<{ count: string }>(`select count(*)::text as count from content_records c where ${where}`, values);
    const total = Number(totalResult.rows[0]?.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const boundedPage = Math.min(safePage, totalPages);
    const boundedOffset = (boundedPage - 1) * limit;

    const listValues = [...values, limit, boundedOffset];
    const result = await getPool().query<ContentRow & ImageRow>(
      `select
        c.id,
        c.session_id,
        c.topic,
        c.audience,
        c.tone,
        c.content_type,
        c.title,
        c.excerpt,
        c.content,
        c.provider,
        c.created_at,
        c.updated_at,
        i.id as image_id,
        i.style as image_style,
        i.prompt as image_prompt,
        i.image_url,
        i.provider as image_provider,
        i.version as image_version,
        i.created_at as image_created_at
      from (
        select * from content_records c
        where ${where}
        order by c.updated_at desc
        limit $${values.length + 1}
        offset $${values.length + 2}
      ) c
      left join image_versions i on i.content_id = c.id
      order by c.updated_at desc, i.version asc`,
      listValues
    );

    return {
      items: rowsToRecords(result.rows),
      page: boundedPage,
      limit,
      total,
      totalPages,
    };
  }

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
  if (hasDatabase()) {
    await ensureSchema();
    const result = await getPool().query<ContentRow & ImageRow>(
      `select
        c.id,
        c.session_id,
        c.topic,
        c.audience,
        c.tone,
        c.content_type,
        c.title,
        c.excerpt,
        c.content,
        c.provider,
        c.created_at,
        c.updated_at,
        i.id as image_id,
        i.style as image_style,
        i.prompt as image_prompt,
        i.image_url,
        i.provider as image_provider,
        i.version as image_version,
        i.created_at as image_created_at
      from content_records c
      left join image_versions i on i.content_id = c.id
      where c.id = $1 and c.session_id = $2
      order by i.version asc`,
      [id, sessionId]
    );

    const record = rowsToRecords(result.rows)[0];
    if (!record) {
      throw new ApiError(404, "not_found", "Content item was not found.");
    }
    return record;
  }

  const store = await readStore();
  const record = store.content.find((item) => item.id === id && item.sessionId === sessionId);
  if (!record) {
    throw new ApiError(404, "not_found", "Content item was not found.");
  }
  return record;
}

export async function addImageVersion(sessionId: string, contentId: string, image: ImageVersion) {
  if (hasDatabase()) {
    await ensureSchema();
    const existing = await getContent(sessionId, contentId);
    const now = new Date().toISOString();

    await getPool().query(
      `insert into image_versions (
        id, content_id, style, prompt, image_url, provider, version, created_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [image.id, contentId, image.style, image.prompt, image.imageUrl, image.provider, image.version, image.createdAt]
    );
    await getPool().query("update content_records set updated_at = $1 where id = $2 and session_id = $3", [now, contentId, sessionId]);

    return {
      ...existing,
      images: [...existing.images, image],
      updatedAt: now,
    };
  }

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
  if (hasDatabase()) {
    await ensureSchema();
    const result = await getPool().query("delete from content_records where id = $1 and session_id = $2", [id, sessionId]);
    if (!result.rowCount) {
      throw new ApiError(404, "not_found", "Content item was not found.");
    }
    return;
  }

  const store = await readStore();
  const next = store.content.filter((item) => !(item.id === id && item.sessionId === sessionId));
  if (next.length === store.content.length) {
    throw new ApiError(404, "not_found", "Content item was not found.");
  }

  store.content = next;
  await writeStore(store);
}

export async function getSettings(sessionId: string) {
  if (hasDatabase()) {
    await ensureSchema();
    const result = await getPool().query<SettingsRow>("select * from user_settings where session_id = $1", [sessionId]);
    return result.rows[0] ? rowToSettings(result.rows[0]) : defaultSettings(sessionId);
  }

  const store = await readStore();
  return store.settings.find((item) => item.sessionId === sessionId) || defaultSettings(sessionId);
}

export async function updateSettings(sessionId: string, updates: Partial<Omit<UserSettings, "sessionId" | "updatedAt">>) {
  if (hasDatabase()) {
    await ensureSchema();
    const current = await getSettings(sessionId);
    const next: UserSettings = {
      ...current,
      ...updates,
      sessionId,
      updatedAt: new Date().toISOString(),
    };

    await getPool().query(
      `insert into user_settings (
        session_id, default_tone, default_content_type, brand_name, brand_industry, brand_voice, updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (session_id) do update set
        default_tone = excluded.default_tone,
        default_content_type = excluded.default_content_type,
        brand_name = excluded.brand_name,
        brand_industry = excluded.brand_industry,
        brand_voice = excluded.brand_voice,
        updated_at = excluded.updated_at`,
      [next.sessionId, next.defaultTone, next.defaultContentType, next.brandName, next.brandIndustry, next.brandVoice, next.updatedAt]
    );

    return next;
  }

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

interface ContentRow {
  id: string;
  session_id: string;
  topic: string;
  audience: string;
  tone: string;
  content_type: ContentType;
  title: string;
  excerpt: string;
  content: string;
  provider: ContentRecord["provider"];
  created_at: Date | string;
  updated_at: Date | string;
}

interface ImageRow {
  image_id: string | null;
  image_style: ImageVersion["style"] | null;
  image_prompt: string | null;
  image_url: string | null;
  image_provider: ImageVersion["provider"] | null;
  image_version: number | null;
  image_created_at: Date | string | null;
}

interface SettingsRow {
  session_id: string;
  default_tone: string;
  default_content_type: ContentType;
  brand_name: string;
  brand_industry: string;
  brand_voice: string;
  updated_at: Date | string;
}

function rowsToRecords(rows: Array<ContentRow & ImageRow>) {
  const records = new Map<string, ContentRecord>();

  for (const row of rows) {
    if (!records.has(row.id)) {
      records.set(row.id, {
        id: row.id,
        sessionId: row.session_id,
        topic: row.topic,
        audience: row.audience,
        tone: row.tone,
        contentType: row.content_type,
        title: cleanStoredText(row.title),
        excerpt: cleanStoredText(row.excerpt),
        content: cleanStoredText(row.content),
        provider: row.provider,
        images: [],
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      });
    }

    if (row.image_id && row.image_style && row.image_prompt && row.image_url && row.image_provider && row.image_version && row.image_created_at) {
      records.get(row.id)?.images.push({
        id: row.image_id,
        contentId: row.id,
        style: row.image_style,
        prompt: row.image_prompt,
        imageUrl: row.image_url,
        provider: row.image_provider,
        version: row.image_version,
        createdAt: toIso(row.image_created_at),
      });
    }
  }

  return [...records.values()];
}

function rowToSettings(row: SettingsRow): UserSettings {
  return {
    sessionId: row.session_id,
    defaultTone: row.default_tone,
    defaultContentType: row.default_content_type,
    brandName: row.brand_name,
    brandIndustry: row.brand_industry,
    brandVoice: row.brand_voice,
    updatedAt: toIso(row.updated_at),
  };
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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
