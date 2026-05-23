"use client";

import { HistoryCard } from "@/components/bloom/history-card";
import { PageHeader } from "@/components/bloom/page-header";
import { Card } from "@/components/ui/card";
import { listContent, type ContentRecord } from "@/lib/content-client";
import { BarChart3, CheckCircle, Clock, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const colorMap: Record<string, string> = {
  sage: "bg-sage-pale text-sage",
  terracotta: "bg-terracotta-pale text-terracotta",
  lavender: "bg-lavender-pale text-lavender",
};

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    listContent({ limit: 6 })
      .then((data) => {
        if (active) setItems(data.items);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const imageCount = items.reduce((total, item) => total + item.images.length, 0);
    const formatsUsed = new Set(items.map((item) => item.contentType)).size;
    const savedMinutes = items.length * 28 + imageCount * 12;

    return [
      { icon: BarChart3, value: String(items.length), label: "Blooms Created", color: "sage" },
      { icon: Clock, value: formatSavedTime(savedMinutes), label: "Time Saved", color: "terracotta" },
      { icon: Heart, value: String(imageCount), label: "Visuals Generated", color: "lavender" },
      { icon: CheckCircle, value: String(formatsUsed), label: "Formats Used", color: "sage" },
    ];
  }, [items]);

  return (
    <div>
      <PageHeader
        title="Good morning, gardener ðŸŒ±"
        description="Your content garden is flourishing. Here's what's blooming today."
      />

      <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-7 hover:-translate-y-1">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] ${colorMap[stat.color]}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div className="mb-1 font-display text-3xl font-bold leading-none text-foreground">
              {stat.value}
            </div>
            <div className="text-sm font-medium text-[var(--text-secondary)]">{stat.label}</div>
          </Card>
        ))}
      </div>

      <h2 className="mb-6 font-display text-2xl font-semibold">Recent blooms</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <HistoryCard key={item.id} item={item} onOpen={(id) => router.push(`/content/${id}`)} />
        ))}
        {!loading && items.length === 0 && (
          <div className="col-span-full rounded-[var(--radius-md)] border border-[rgba(91,122,84,0.16)] bg-white/90 py-16 text-center text-[var(--text-secondary)] shadow-[var(--card-shadow)] dark:bg-[var(--bg-secondary)]">
            <p className="text-lg">No blooms saved yet</p>
            <p className="mt-1 text-sm">Create your first piece and it will appear here.</p>
          </div>
        )}
        {loading && (
          <div className="col-span-full rounded-[var(--radius-md)] border border-[rgba(91,122,84,0.16)] bg-white/90 py-16 text-center text-[var(--text-secondary)] shadow-[var(--card-shadow)] dark:bg-[var(--bg-secondary)]">
            <span className="bloom-loading mx-auto mb-3 flex justify-center gap-1.5 text-sage"><span /><span /><span /></span>
            <p>Loading your content garden...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatSavedTime(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}
