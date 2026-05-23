"use client";

import { PageHeader } from "@/components/bloom/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateContentStream, generateImage, getSettings, type ContentRecord, type ContentType, type ImageStyle } from "@/lib/content-client";
import { cn } from "@/lib/utils";
import {
  Copy,
  Download,
  FileText,
  Grid3X3,
  ImageIcon,
  BriefcaseBusiness,
  Mail,
  MessageSquare,
  Printer,
  RefreshCw,
  Sparkles,
  Target,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const tones = ["Professional", "Casual", "Witty", "Inspirational", "Bold"];
const contentTypes = [
  { id: "blog", label: "Blog Post", icon: FileText },
  { id: "linkedin", label: "LinkedIn", icon: BriefcaseBusiness },
  { id: "ad", label: "Ad Copy", icon: Zap },
  { id: "email", label: "Newsletter", icon: Mail },
] as const;
const imageStyles: Array<{ id: ImageStyle; label: string }> = [
  { id: "photographic", label: "Photographic" },
  { id: "illustration", label: "Illustration" },
  { id: "3d", label: "3D Render" },
  { id: "minimalist", label: "Minimalist" },
  { id: "abstract", label: "Abstract" },
];

export default function CreatePage() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("Professional");
  const [type, setType] = useState<ContentType>("blog");
  const [generating, setGenerating] = useState(false);
  const [record, setRecord] = useState<ContentRecord | null>(null);
  const [output, setOutput] = useState("");
  const [displayedOutput, setDisplayedOutput] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageStyle, setImageStyle] = useState<ImageStyle>("photographic");
  const [brandVoice, setBrandVoice] = useState("");
  const [error, setError] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((response) => {
        if (!active) return;
        setTone(response.settings.defaultTone);
        setType(response.settings.defaultContentType);
        setBrandVoice(response.settings.brandVoice);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const generate = useCallback(async () => {
    setGenerating(true);
    setShowOutput(true);
    setShowImage(false);
    setError("");
    setOutput("");
    setDisplayedOutput("");
    setRecord(null);
    window.setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

    try {
      let streamedOutput = "";
      const response = await generateContentStream({ topic, audience, tone, contentType: type, brandVoice }, (delta) => {
        streamedOutput += delta;
        setOutput(streamedOutput);
        setDisplayedOutput(streamedOutput);
      });
      setRecord(response.item);
      setOutput(response.item.content);
      setDisplayedOutput(response.item.content);
      setShowOutput(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate content.");
      setShowOutput(false);
    } finally {
      setGenerating(false);
    }
  }, [audience, brandVoice, tone, topic, type]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!generating && topic.trim() && audience.trim()) {
          void generate();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [audience, generate, generating, topic]);

  const showVisual = async (regenerate = false) => {
    if (!record) return;

    setShowImage(true);
    setImageLoading(true);
    setError("");

    try {
      const response = await generateImage(record.id, imageStyle, regenerate);
      setRecord(response.item);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate image.");
    } finally {
      setImageLoading(false);
    }
  };

  const latestImage = record?.images.at(-1);
  const outputLabel = type === "blog" ? "blog post" : type === "linkedin" ? "LinkedIn post" : type === "ad" ? "ad copy" : "newsletter";
  const canGenerate = topic.trim().length > 0 && audience.trim().length > 0;

  return (
    <div>
      <PageHeader
        title="Plant a new idea"
        description="Tell us what you'd like to grow, and we'll nurture it into beautiful content."
      />

      {error && (
        <div className="mb-5 rounded-[var(--radius-md)] border border-terracotta/30 bg-terracotta-pale/50 px-4 py-3 text-sm font-medium text-terracotta">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Topic" icon={Timer}>
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. Sustainable living tips for beginners"
            className="bloom-field px-[18px] py-3.5 text-[0.95rem]"
          />
        </Field>

        <Field label="Target Audience" icon={Users}>
          <input
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="e.g. Millennials interested in eco-friendly lifestyle"
            className="bloom-field px-[18px] py-3.5 text-[0.95rem]"
          />
        </Field>

        <Field label="Tone" icon={MessageSquare} className="md:col-span-2">
          <div className="flex flex-wrap gap-2">
            {tones.map((selectedTone) => (
              <button
                key={selectedTone}
                type="button"
                onClick={() => setTone(selectedTone)}
                className={cn(
                  "rounded-[var(--radius-pill)] border-[1.5px] px-5 py-2.5 text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105",
                  tone === selectedTone
                    ? "border-sage bg-sage text-white scale-105"
                    : "border-[rgba(91,122,84,0.24)] bg-white text-[var(--text-secondary)] hover:border-sage dark:bg-[var(--bg-secondary)]"
                )}
              >
                {selectedTone}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Content Type" icon={Grid3X3} className="md:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {contentTypes.map((contentType) => (
              <button
                key={contentType.id}
                type="button"
                onClick={() => setType(contentType.id)}
                className={cn(
                  "flex flex-col items-center gap-2.5 rounded-[var(--radius-md)] border-[1.5px] p-5 text-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:scale-[1.02]",
                  type === contentType.id
                    ? "border-sage bg-sage-pale text-sage shadow-[0_4px_16px_rgba(125,155,118,0.15)]"
                    : "border-[rgba(91,122,84,0.2)] bg-white text-[var(--text-secondary)] hover:border-sage dark:bg-[var(--bg-secondary)]"
                )}
              >
                <contentType.icon className="h-8 w-8 text-sage" />
                <span className="text-sm font-medium">{contentType.label}</span>
              </button>
            ))}
          </div>
        </Field>

        <Button onClick={generate} disabled={generating || !canGenerate} size="lg" className="md:col-span-2 min-h-14 animate-[gentlePulse_3s_ease-in-out_infinite] text-[1.05rem]">
          {generating ? (
            <>
              <span className="bloom-loading flex gap-1.5"><span /><span /><span /></span>
              Growing your content...
            </>
          ) : (
            <>
              Create Magic <Sparkles className="h-4 w-4" />
              <span className="ml-1 hidden text-xs font-medium opacity-80 sm:inline">Ctrl+Enter</span>
            </>
          )}
        </Button>
      </div>

      {showOutput && (
        <div ref={outputRef} className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="relative overflow-hidden rounded-[var(--radius-lg)] p-9 before:absolute before:left-0 before:right-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-sage before:via-terracotta-light before:to-lavender">
            <h3 className="mb-4 font-display text-[1.3rem] font-semibold">Your fresh {outputLabel}</h3>
            <div className="whitespace-pre-wrap text-base leading-[1.8] text-[var(--text-secondary)]">
              {displayedOutput}
              {generating && <span className="typing-cursor" />}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(output)}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const blob = new Blob([output], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "bloom-content.txt";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4" /> Download
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Export PDF
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void showVisual(false)} disabled={imageLoading || !record}>
                <ImageIcon className="h-4 w-4" /> Create Visual
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showImage && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="relative overflow-hidden rounded-[var(--radius-lg)] p-9 before:absolute before:left-0 before:right-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-sage before:via-terracotta-light before:to-lavender">
            <h3 className="mb-4 font-display text-[1.3rem] font-semibold">Visual companion</h3>
            <div className="relative mb-5 flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border-2 border-dashed border-[rgba(91,122,84,0.3)] bg-gradient-to-br from-sage-pale via-white to-lavender-pale text-[var(--text-secondary)]">
              {imageLoading ? (
                <>
                  <span className="bloom-loading flex gap-1.5 text-sage"><span /><span /><span /></span>
                  <span className="text-sm">Cultivating your visual...</span>
                </>
              ) : latestImage ? (
                <div
                  aria-label="Generated visual companion"
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${latestImage.imageUrl})` }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sage-light via-lavender to-terracotta-light">
                  <ImageIcon className="h-16 w-16 text-white/50" />
                </div>
              )}
            </div>
            <label className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
              <Target className="h-4 w-4 text-sage" /> Style
            </label>
            <div className="mb-5 flex flex-wrap gap-2.5">
              {imageStyles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setImageStyle(style.id)}
                  className={cn(
                    "rounded-[var(--radius-pill)] border-[1.5px] px-[18px] py-2.5 text-sm font-medium transition-all duration-500 hover:scale-105",
                    imageStyle === style.id
                      ? "border-terracotta bg-terracotta text-white"
                      : "border-[rgba(91,122,84,0.24)] bg-white text-[var(--text-secondary)] dark:bg-[var(--bg-secondary)]"
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => void showVisual(true)} disabled={imageLoading || !record}>
              <RefreshCw className="h-4 w-4" /> Try Another Style
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon: typeof Timer;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
        <Icon className="h-4 w-4 text-sage" />
        {label}
      </label>
      {children}
    </div>
  );
}
