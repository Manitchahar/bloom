"use client";

import { PageHeader } from "@/components/bloom/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteContent, generateImage, getContent, type ContentRecord, type ImageStyle } from "@/lib/content-client";
import { downloadImage } from "@/lib/download";
import { ArrowLeft, Copy, Download, ImageIcon, RefreshCw, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const imageStyles: Array<{ id: ImageStyle; label: string }> = [
  { id: "photographic", label: "Photographic" },
  { id: "illustration", label: "Illustration" },
  { id: "3d", label: "3D Render" },
  { id: "minimalist", label: "Minimalist" },
  { id: "abstract", label: "Abstract" },
];

export default function ContentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ContentRecord | null>(null);
  const [imageStyle, setImageStyle] = useState<ImageStyle>("photographic");
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getContent(params.id)
      .then((response) => {
        if (active) {
          setItem(response.item);
          setImageStyle(response.item.images.at(-1)?.style || "photographic");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load this bloom.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  const latestImage = item?.images.at(-1);

  const createVisual = async (regenerate: boolean) => {
    if (!item) return;
    setImageLoading(true);
    setError("");

    try {
      const response = await generateImage(item.id, imageStyle, regenerate);
      setItem(response.item);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate image.");
    } finally {
      setImageLoading(false);
    }
  };

  const remove = async () => {
    if (!item) return;
    try {
      await deleteContent(item.id);
      router.push("/library");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete this bloom.");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Button variant="secondary" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <PageHeader
        title={item?.title || "Saved bloom"}
        description={item ? `${item.contentType} for ${item.audience}` : "Loading your saved content."}
      />

      {error && (
        <div className="mb-5 rounded-[var(--radius-md)] border border-terracotta/30 bg-terracotta-pale/50 px-4 py-3 text-sm font-medium text-terracotta">
          {error}
        </div>
      )}

      {loading && (
        <Card className="rounded-[var(--radius-lg)] p-9 text-center text-[var(--text-secondary)]">
          <span className="bloom-loading mx-auto mb-3 flex justify-center gap-1.5 text-sage"><span /><span /><span /></span>
          Loading saved bloom...
        </Card>
      )}

      {item && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <Card className="relative overflow-hidden rounded-[var(--radius-lg)] p-9 before:absolute before:left-0 before:right-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-sage before:via-terracotta-light before:to-lavender">
            <div className="mb-5 flex flex-wrap gap-2 text-xs font-medium text-[var(--text-secondary)]">
              <span className="rounded-[var(--radius-pill)] bg-sage-pale px-3 py-1 text-sage">{item.contentType}</span>
              <span className="rounded-[var(--radius-pill)] bg-muted px-3 py-1">{item.tone}</span>
              <span className="rounded-[var(--radius-pill)] bg-muted px-3 py-1">{new Date(item.createdAt).toLocaleString()}</span>
            </div>
            <div className="whitespace-pre-wrap text-base leading-[1.8] text-[var(--text-secondary)]">
              {item.content}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(item.content)}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const blob = new Blob([item.content], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${item.title.slice(0, 40) || "bloom-content"}.txt`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4" /> Download
              </Button>
              <Button variant="destructive" size="sm" onClick={remove}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </Card>

          <Card className="relative overflow-hidden rounded-[var(--radius-lg)] p-7 before:absolute before:left-0 before:right-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-sage before:via-terracotta-light before:to-lavender">
            <h3 className="mb-4 font-display text-xl font-semibold">Visual companion</h3>
            <div className="relative mb-5 flex aspect-video w-full items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border-2 border-dashed border-[rgba(91,122,84,0.3)] bg-gradient-to-br from-sage-pale via-white to-lavender-pale text-[var(--text-secondary)]">
              {imageLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="bloom-loading flex gap-1.5 text-sage"><span /><span /><span /></span>
                  <span className="text-sm">Cultivating your visual...</span>
                </div>
              ) : latestImage ? (
                <div
                  aria-label="Generated visual companion"
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${latestImage.imageUrl})` }}
                />
              ) : (
                <ImageIcon className="h-16 w-16 opacity-50" />
              )}
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {imageStyles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setImageStyle(style.id)}
                  className={`rounded-[var(--radius-pill)] border-[1.5px] px-4 py-2 text-sm font-medium transition-all ${
                    imageStyle === style.id
                      ? "border-terracotta bg-terracotta text-white"
                      : "border-[rgba(91,122,84,0.24)] bg-white text-[var(--text-secondary)] hover:border-sage"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="sm" onClick={() => void createVisual(false)} disabled={imageLoading}>
                <ImageIcon className="h-4 w-4" /> Create Visual
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void createVisual(true)} disabled={imageLoading}>
                <RefreshCw className="h-4 w-4" /> Regenerate
              </Button>
              {latestImage && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void downloadImage(latestImage.imageUrl, `${item.title || "bloom"} visual v${latestImage.version}`)}
                >
                  <Download className="h-4 w-4" /> Download Image
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
