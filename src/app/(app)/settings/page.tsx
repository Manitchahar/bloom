"use client";

import { PageHeader } from "@/components/bloom/page-header";
import { Card } from "@/components/ui/card";
import { getSettings, updateSettings, type ContentType } from "@/lib/content-client";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const tones = ["Professional", "Casual", "Witty", "Inspirational", "Bold"];
const contentTypes: Array<{ label: string; value: ContentType }> = [
  { label: "Blog Post", value: "blog" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Ad Copy", value: "ad" },
  { label: "Newsletter", value: "email" },
];
const voicePresets = [
  { label: "Empathetic and warm", text: "Empathetic and warm - like a trusted friend, caring and honest." },
  { label: "Bold and direct", text: "Bold and direct - confident, punchy, no fluff. Gets straight to the point." },
  { label: "Educational and clear", text: "Educational and clear - thoughtful explanations, evidence-based, accessible to all." },
  { label: "Playful and creative", text: "Playful and creative - witty, imaginative, uses humor and metaphors sparingly." },
  { label: "Luxurious and refined", text: "Luxurious and refined - elegant, aspirational, every word is deliberate and polished." },
];
type SettingsUpdate = Parameters<typeof updateSettings>[0];

export default function SettingsPage() {
  const [defaultTone, setDefaultTone] = useState("Professional");
  const [defaultContentType, setDefaultContentType] = useState<ContentType>("blog");
  const [brandVoice, setBrandVoice] = useState("");
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandIndustry, setBrandIndustry] = useState("");
  const [status, setStatus] = useState("Saved");
  const [settingsReady, setSettingsReady] = useState(false);
  const mountedRef = useRef(true);
  const saveInFlightRef = useRef(false);
  const pendingSettingsRef = useRef<SettingsUpdate | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      pendingSettingsRef.current = null;
    };
  }, []);

  const queueSettingsSave = useCallback(async (updates: SettingsUpdate) => {
    pendingSettingsRef.current = updates;
    if (saveInFlightRef.current) return;

    saveInFlightRef.current = true;
    while (pendingSettingsRef.current) {
      const nextUpdates = pendingSettingsRef.current;
      pendingSettingsRef.current = null;
      if (mountedRef.current) setStatus("Saving...");

      try {
        await updateSettings(nextUpdates);
        if (mountedRef.current && !pendingSettingsRef.current) setStatus("Saved");
      } catch {
        if (mountedRef.current && !pendingSettingsRef.current) setStatus("Unable to save");
      }
    }
    saveInFlightRef.current = false;
  }, []);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((response) => {
        if (!active) return;
        setDefaultTone(response.settings.defaultTone);
        setDefaultContentType(response.settings.defaultContentType);
        setBrandVoice(response.settings.brandVoice);
        setBrandName(response.settings.brandName);
        setBrandIndustry(response.settings.brandIndustry);
        setSettingsReady(true);
      })
      .catch(() => {
        if (active) {
          setStatus("Using local defaults");
          setSettingsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsReady) return;

    const timer = window.setTimeout(() => {
      void queueSettingsSave({ defaultTone, defaultContentType, brandName, brandIndustry, brandVoice });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [brandIndustry, brandName, brandVoice, defaultContentType, defaultTone, queueSettingsSave, settingsReady]);

  return (
    <div>
      <PageHeader title="Settings" description="Shape the defaults Bloom uses when creating new content." />

      <Card className="max-w-[680px] rounded-[var(--radius-lg)] p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="font-display text-xl font-semibold">Content Defaults</h3>
          <span className="rounded-[var(--radius-pill)] bg-sage-pale px-3 py-1 text-xs font-medium text-sage">
            {status}
          </span>
        </div>

        <Section title="Default Tone">
          <div className="flex flex-wrap gap-2">
            {tones.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setDefaultTone(tone)}
                className={cn(
                  "rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-medium transition-all",
                  defaultTone === tone
                    ? "border-sage bg-sage text-white"
                    : "border-[rgba(91,122,84,0.24)] bg-white text-[var(--text-secondary)] hover:border-sage hover:text-sage"
                )}
              >
                {tone}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Default Format">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {contentTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setDefaultContentType(type.value)}
                className={cn(
                  "rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium transition-all",
                  defaultContentType === type.value
                    ? "border-sage bg-sage-pale text-sage"
                    : "border-[rgba(91,122,84,0.24)] bg-white text-[var(--text-secondary)] hover:border-sage hover:text-sage"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Brand Voice">
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            These notes are sent to the backend prompt so generated copy sounds closer to your brand.
          </p>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Brand name">
              <input
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="e.g. Bloom Co."
                className="bloom-field px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Industry">
              <input
                value={brandIndustry}
                onChange={(event) => setBrandIndustry(event.target.value)}
                placeholder="e.g. Sustainable fashion"
                className="bloom-field px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <Field label="Describe your brand's personality and communication style">
            <textarea
              value={brandVoice}
              onChange={(event) => {
                setActivePreset(null);
                setBrandVoice(event.target.value);
              }}
              placeholder="e.g. We speak with warmth and authenticity. Our tone is empathetic and direct..."
              className="bloom-field mb-3 min-h-[110px] resize-y bg-cream px-4 py-3 text-sm"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {voicePresets.map((preset, index) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setActivePreset(index);
                  setBrandVoice(preset.text);
                }}
                className={cn(
                  "rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium transition-all",
                  activePreset === index
                    ? "border-sage-light bg-sage-pale text-sage"
                    : "border-[rgba(91,122,84,0.24)] bg-white text-[var(--text-secondary)] hover:border-sage hover:text-sage"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </Section>

        <div>
          <h3 className="mb-4 font-display text-xl font-semibold">Account</h3>
          <div className="space-y-3">
            <SettingValue label="Plan" value="Pro" pill />
            <SettingValue label="Credits remaining" value="Unlimited" strong />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8 border-b border-[rgba(91,122,84,0.18)] pb-8">
      <h3 className="mb-4 font-display text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

function SettingValue({
  label,
  value,
  pill,
  strong,
}: {
  label: string;
  value: string;
  pill?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      <span
        className={cn(
          "text-sm font-medium text-sage",
          pill && "rounded-[var(--radius-pill)] bg-sage-pale px-3 py-1 text-xs",
          strong && "font-display text-lg font-bold"
        )}
      >
        {value}
      </span>
    </div>
  );
}
