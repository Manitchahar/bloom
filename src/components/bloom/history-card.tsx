import type { ContentRecord, ContentType } from "@/lib/content-client";
import { BriefcaseBusiness, FileText, Mail, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type CardColor = "sage" | "lavender" | "terracotta";

const badgeColorMap: Record<CardColor, string> = {
  sage: "bg-sage-pale text-sage",
  lavender: "bg-lavender-pale text-lavender",
  terracotta: "bg-terracotta-pale text-terracotta",
};

const iconColorMap: Record<CardColor, string> = {
  sage: "text-sage from-sage-pale to-white",
  lavender: "text-lavender from-lavender-pale to-white",
  terracotta: "text-terracotta from-terracotta-pale to-white",
};

const typeIconMap: Record<ContentType, typeof FileText> = {
  blog: FileText,
  linkedin: BriefcaseBusiness,
  ad: Zap,
  email: Mail,
};

const colorByType: Record<ContentType, CardColor> = {
  blog: "sage",
  linkedin: "lavender",
  ad: "terracotta",
  email: "sage",
};

export function HistoryCard({
  item,
  onDelete,
  onOpen,
}: {
  item: ContentRecord;
  onDelete?: (id: string) => void;
  onOpen?: (id: string) => void;
}) {
  const Icon = typeIconMap[item.contentType];
  const color = colorByType[item.contentType];
  const latestImage = item.images.at(-1);

  return (
    <article
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => onOpen?.(item.id)}
      onKeyDown={(event) => {
        if (!onOpen) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item.id);
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-[var(--radius-md)] border border-[rgba(91,122,84,0.13)] bg-card shadow-[var(--card-shadow)] transition-all duration-400 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-1.5 hover:scale-[1.01] hover:border-[rgba(91,122,84,0.2)] hover:shadow-[var(--card-shadow-hover)]"
    >
      <div className={cn("relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-gradient-to-br", iconColorMap[color])}>
        {latestImage ? (
          <div
            aria-hidden="true"
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${latestImage.imageUrl})` }}
          />
        ) : (
          <Icon className="h-10 w-10 opacity-55" strokeWidth={1.75} />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold leading-snug text-foreground">
            {item.title}
          </h3>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100"
              aria-label={`Delete ${item.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(item.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mb-3 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
          {item.excerpt}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium", badgeColorMap[color])}>
            {item.contentType}
          </span>
          <span className="rounded-[var(--radius-pill)] bg-muted px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            {formatDate(item.createdAt)}
          </span>
          {latestImage && (
            <span className="rounded-[var(--radius-pill)] bg-white px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
              image v{latestImage.version}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "recently";

  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
