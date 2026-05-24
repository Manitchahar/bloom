"use client";

import { PageHeader } from "@/components/bloom/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSettings, improveContentStream, type ImprovementGoal } from "@/lib/content-client";
import { cn } from "@/lib/utils";
import { Briefcase, Check, Clock, Copy, RotateCcw, Scissors, Search, SquarePen, Users, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const goals = [
  { id: "shorter", label: "Shorter", icon: Scissors },
  { id: "persuasive", label: "More Persuasive", icon: Zap },
  { id: "formal", label: "More Formal", icon: Briefcase },
  { id: "seo", label: "SEO-Optimized", icon: Search },
  { id: "audience", label: "Different Audience", icon: Users },
] as const;

export default function ImprovePage() {
  const [input, setInput] = useState("");
  const [goal, setGoal] = useState<ImprovementGoal>("shorter");
  const [improving, setImproving] = useState(false);
  const [result, setResult] = useState<{ text: string; explanation: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [brandVoice, setBrandVoice] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const improveRequestRef = useRef(0);
  const improvingRef = useRef(false);
  const canImprove = input.trim().length > 0 && (goal !== "audience" || targetAudience.trim().length > 0);

  useEffect(() => {
    return () => {
      improveRequestRef.current += 1;
      improvingRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((response) => {
        if (active) setBrandVoice(response.settings.brandVoice);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const improve = useCallback(async () => {
    if (!canImprove || improvingRef.current) return;

    improvingRef.current = true;
    const requestId = improveRequestRef.current + 1;
    improveRequestRef.current = requestId;
    setImproving(true);
    setResult(null);
    setError("");
    setCopied(false);

    try {
      let streamedText = "";
      const response = await improveContentStream({
        content: input,
        goal,
        audience: goal === "audience" ? targetAudience : undefined,
        brandVoice,
      }, (delta) => {
        if (improveRequestRef.current !== requestId) return;
        streamedText += delta;
        setResult({ text: streamedText, explanation: "" });
      });
      if (improveRequestRef.current === requestId) {
        setResult({ text: response.improved, explanation: response.explanation });
      }
    } catch (requestError) {
      if (improveRequestRef.current === requestId) {
        setError(requestError instanceof Error ? requestError.message : "Unable to refine content.");
      }
    } finally {
      if (improveRequestRef.current === requestId) {
        improvingRef.current = false;
        setImproving(false);
      }
    }
  }, [brandVoice, canImprove, goal, input, targetAudience]);

  const copyResult = useCallback(async () => {
    if (!result?.text) return;

    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Unable to copy refined text.");
    }
  }, [result]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void improve();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [improve]);

  return (
    <div>
      <PageHeader
        title="Refine & polish"
        description="Paste your existing content and let us help it blossom into something even better."
      />

      {error && (
        <div className="mb-5 rounded-[var(--radius-md)] border border-terracotta/30 bg-terracotta-pale/50 px-4 py-3 text-sm font-medium text-terracotta">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="rounded-[var(--radius-lg)] p-7">
          <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <SquarePen className="h-5 w-5 text-terracotta" /> Your original content
          </h3>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste your content here... We'll help it grow into something wonderful."
            className="bloom-field min-h-[200px] resize-y bg-cream px-[18px] py-4 text-[0.95rem] leading-[1.7]"
          />
          <div className="my-5 flex flex-wrap gap-2.5">
            {goals.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setGoal(item.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-[var(--radius-pill)] border-[1.5px] px-[18px] py-2.5 text-sm font-medium transition-all duration-500 hover:scale-105",
                  goal === item.id
                    ? "border-sage bg-sage-pale text-sage"
                    : "border-[rgba(91,122,84,0.24)] bg-white text-[var(--text-secondary)] hover:border-sage dark:bg-[var(--bg-secondary)]"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
          {goal === "audience" && (
            <label className="mb-5 block">
              <span className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
                <Users className="h-4 w-4 text-sage" />
                New audience
              </span>
              <input
                value={targetAudience}
                onChange={(event) => setTargetAudience(event.target.value)}
                placeholder="e.g. enterprise buyers, Gen Z founders, nonprofit donors"
                className="bloom-field px-[18px] py-3.5 text-[0.95rem]"
              />
            </label>
          )}
          <Button onClick={improve} disabled={improving || !canImprove} className="w-full">
            {improving ? (
              <>
                <span className="bloom-loading flex gap-1.5"><span /><span /><span /></span>
                Nurturing your words...
              </>
            ) : (
              "Refine this content"
            )}
          </Button>
        </Card>

        <Card className="rounded-[var(--radius-lg)] p-7">
          <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <Check className="h-5 w-5 text-sage" /> Refined version
          </h3>
          {!result && !improving && (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[var(--radius-md)] border border-[rgba(91,122,84,0.16)] bg-cream/80 text-center text-[var(--text-secondary)]">
              <Clock className="mb-3 h-10 w-10 opacity-55" />
              <p>Your polished content will appear here...</p>
            </div>
          )}
          {improving && !result && (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-[var(--text-secondary)]">
              <span className="bloom-loading mb-4 flex gap-1.5 text-sage"><span /><span /><span /></span>
              <p>Nurturing your words...</p>
            </div>
          )}
          {result && (
            <div className="animate-in fade-in duration-500">
              <div className="mb-4 whitespace-pre-wrap rounded-[var(--radius-sm)] bg-sage-pale/45 p-5 leading-relaxed text-foreground">
                {result.text}
              </div>
              {result.explanation && (
                <div className="mb-4 rounded-[var(--radius-sm)] bg-muted p-4 text-sm italic text-[var(--text-secondary)]">
                  {result.explanation}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  disabled={improving}
                  onClick={() => {
                    setInput(result.text);
                    setResult(null);
                  }}
                >
                  <Check className="h-4 w-4" /> Keep This
                </Button>
                <Button variant="secondary" size="sm" disabled={improving} onClick={copyResult}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="secondary" size="sm" disabled={improving} onClick={() => setResult(null)}>
                  <RotateCcw className="h-4 w-4" /> Start Over
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
