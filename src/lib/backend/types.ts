export const contentTypes = ["blog", "linkedin", "ad", "email"] as const;
export const improvementGoals = ["shorter", "persuasive", "formal", "seo", "audience"] as const;
export const imageStyles = ["photographic", "illustration", "3d", "minimalist", "abstract"] as const;

export type ContentType = (typeof contentTypes)[number];
export type ImprovementGoal = (typeof improvementGoals)[number];
export type ImageStyle = (typeof imageStyles)[number];
export type ProviderName = "openai" | "xiaomi" | "google" | "custom" | "mock";

export interface ImageVersion {
  id: string;
  contentId: string;
  style: ImageStyle;
  prompt: string;
  imageUrl: string;
  provider: ProviderName;
  version: number;
  createdAt: string;
}

export interface ContentRecord {
  id: string;
  sessionId: string;
  topic: string;
  audience: string;
  tone: string;
  contentType: ContentType;
  title: string;
  excerpt: string;
  content: string;
  provider: ProviderName;
  images: ImageVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedContent {
  items: ContentRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserSettings {
  sessionId: string;
  defaultTone: string;
  defaultContentType: ContentType;
  brandName: string;
  brandIndustry: string;
  brandVoice: string;
  updatedAt: string;
}
