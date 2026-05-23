# Bloom - AI Content Marketing Suite

Bloom is a production-style SaaS web app for marketers to create, improve, save, and revisit AI-generated campaign content. It supports multi-format text generation, matching image generation per post, session-scoped history, saved visual versions, copy/download/export actions, and brand voice defaults.

Built for the Magna Labs 48-Hour AI Engineering Challenge.

## Challenge Coverage

| Requirement | Status |
| --- | --- |
| AI content generator | Supports blog posts, LinkedIn posts, ad copy, and newsletters with distinct prompt strategies. |
| AI image generator per post | Generates a visual companion from saved content context and selected style. |
| Regenerate image with style | Regeneration creates a new prompt/context-based image version without image-to-image dependency. |
| Content history and dashboard | Saves generated text and images per browser session, with dashboard, library, detail view, copy, download, and delete. |
| AI content improver | Supports shorter, persuasive, formal, SEO, and audience rewrite goals with explanation. |
| REST API backend | All AI and storage flows use Next.js API routes; frontend never calls AI providers directly. |
| README API docs | Endpoints, request shapes, errors, setup, architecture, and deployment notes are documented here. |
| Bonus features | Brand voice settings, image style picker, export/print flow, polished shadCN/Tailwind UI. |

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadCN-style UI primitives
- Server-side REST API routes
- File-backed JSON persistence for assessment/demo use
- OpenAI-compatible text provider support
- Google image generation support
- Mock fallback when provider keys are missing

## Local Setup

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

For the production build:

```bash
npm run build
npm run start
```

## Environment Variables

Create `.env.local` in the project root. Do not commit this file.

```bash
# Required for signed session cookies in any shared/deployed environment
SESSION_SECRET=replace_with_a_long_random_secret

# Local HTTP only. Use true on HTTPS deployments.
BLOOM_SECURE_COOKIES=false
```

### Text Generation

Bloom supports OpenAI-compatible chat completions for text generation:

```bash
AI_TEXT_BASE_URL=https://provider.example.com/v1
AI_TEXT_MODEL=provider-model-name
AI_TEXT_API_KEY=provider_key_here
AI_TEXT_REASONING_EFFORT=low
AI_TEXT_DISABLE_THINKING=false
```

If using OpenAI directly instead:

```bash
OPENAI_API_KEY=your_openai_key
OPENAI_TEXT_MODEL=gpt-4.1-mini
```

### Image Generation

For Google image generation:

```bash
GOOGLE_AI_API_KEY=your_google_ai_key
IMAGE_MODEL=imagen-4.0-generate-001
```

If no text or image key is configured, Bloom uses mock generation so the app remains demoable. API responses include provider metadata such as `mock`, `xiaomi`, `openai`, `google`, or `custom`.

## Architecture

Bloom keeps the backend inside the Next.js app using App Router route handlers.

```text
Client UI
  -> /api/content/*
  -> /api/settings
       -> session cookie
       -> validation/rate limit helpers
       -> AI prompt builders
       -> provider adapters
       -> file-backed storage
```

Important modules:

- `src/lib/backend/session.ts` - creates and verifies the signed opaque session cookie.
- `src/lib/backend/storage.ts` - stores content, image versions, and settings in `.bloom-data/content-store.json`.
- `src/lib/backend/api.ts` - shared validation, error responses, parsing, and rate-limit helpers.
- `src/lib/backend/ai/prompts.ts` - centralized prompt strategies, image prompt rules, style prompts, and quality rubric.
- `src/lib/backend/ai/text.ts` - server-side text provider calls and mock fallback.
- `src/lib/backend/ai/image.ts` - server-side image provider calls and mock fallback.
- `src/lib/content-client.ts` - browser-side REST client wrapper.

## REST API

All responses use JSON. Successful responses include `success: true`. Errors use the format documented below.

### `POST /api/content/generate`

Generates and saves a new content record.

Request:

```json
{
  "topic": "Sustainable living tips",
  "audience": "Millennials interested in eco-friendly habits",
  "tone": "Professional",
  "contentType": "blog",
  "brandVoice": "Warm, clear, and practical"
}
```

Rules:

- `topic`, `audience`, and `tone` are required.
- `contentType` must be `blog`, `linkedin`, `ad`, or `email`.
- `brandVoice` is optional.

### `GET /api/content`

Lists saved content for the current session.

Query params:

- `type`: `all`, `blog`, `linkedin`, `ad`, or `email`
- `search`: text search across title, excerpt, and content
- `page`: page number
- `limit`: items per page

### `GET /api/content/:id`

Returns one saved content item if it belongs to the current session.

### `DELETE /api/content/:id`

Deletes a saved content item and its image versions.

### `POST /api/content/:id/image`

Generates a visual companion for a saved content item.

Request:

```json
{
  "style": "photographic"
}
```

`style` must be one of:

- `photographic`
- `illustration`
- `3d`
- `minimalist`
- `abstract`

### `POST /api/content/:id/image/regenerate`

Creates the next image version for the same saved content item. Regeneration reuses saved text context and the selected style, but does not pass the previous image back to the model.

### `POST /api/content/improve`

Improves existing copy and returns a short explanation.

Request:

```json
{
  "content": "Paste existing copy here.",
  "goal": "persuasive",
  "audience": "Startup founders",
  "brandVoice": "Direct and useful"
}
```

`goal` must be one of:

- `shorter`
- `persuasive`
- `formal`
- `seo`
- `audience`

### `GET /api/settings`

Returns saved settings for the current session.

### `PATCH /api/settings`

Updates session-scoped defaults and brand voice.

Request:

```json
{
  "defaultTone": "Bold",
  "defaultContentType": "linkedin",
  "brandName": "Bloom",
  "brandIndustry": "Content marketing",
  "brandVoice": "Warm, concise, and practical"
}
```

## Error Format

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "topic is required."
  }
}
```

Common statuses:

- `400` - invalid JSON or validation error
- `404` - content item not found for the current session
- `429` - generation rate limit reached
- `500` - provider or storage failure

## Data Model

Content records include:

- `id`
- `sessionId`
- `topic`
- `audience`
- `tone`
- `contentType`
- `title`
- `excerpt`
- `content`
- `provider`
- `images`
- `createdAt`
- `updatedAt`

Image versions include:

- `id`
- `contentId`
- `style`
- `prompt`
- `imageUrl`
- `provider`
- `version`
- `createdAt`

## Security Notes

- AI provider keys are used only on the server.
- Frontend components call internal REST endpoints only.
- Session ids are stored in signed HTTP-only cookies.
- Content reads, image updates, and deletes are scoped by `sessionId`.
- Generated text is rendered as React text, not raw HTML.
- `.env.local`, `.bloom-data`, build output, and generated artifacts are ignored by git.

For deployment, set a strong `SESSION_SECRET`. Do not rely on local fallback secrets in a shared environment.

## Persistence And Deployment

The assessment build uses lightweight file-backed storage in `.bloom-data/content-store.json`. This keeps the demo simple and easy to inspect.

For serverless or multi-instance deployments, replace the storage implementation with a hosted database such as Postgres, Neon, Supabase, or Vercel Postgres. Local filesystem writes can be ephemeral or inconsistent across instances.

Recommended deployment:

- Vercel or Render for the Next.js app
- Hosted database for durable history if the app needs production persistence
- Real provider keys stored as platform secrets
- `BLOOM_SECURE_COOKIES=true` on HTTPS

## Verification

Run:

```bash
npm run lint
npm run build
```

Manual end-to-end checks:

- Generate a blog post, LinkedIn post, ad, and newsletter.
- Generate a visual companion for saved content.
- Regenerate with a different style.
- Confirm Dashboard and Library show saved text and image data.
- Open a saved bloom from Recent blooms.
- Copy, download, print/export, and delete saved content.
- Improve content for each goal.
- Confirm no client code calls external AI providers directly.

## Known Trade-Offs

- No user accounts are implemented because the assessment requires saved content per session, not full authentication.
- Regeneration is prompt/context-based, not image-to-image, so it works across providers that do not support image input.
- File-backed persistence is intentionally simple for demo/submission. A hosted database is the next production step.
- Mock fallback is included only for local/demo resilience when provider keys are absent.
