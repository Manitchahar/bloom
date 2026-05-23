"use client";

import { HistoryCard } from "@/components/bloom/history-card";
import { PageHeader } from "@/components/bloom/page-header";
import { cn } from "@/lib/utils";
import { deleteContent, listContent, type ContentRecord } from "@/lib/content-client";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const filters = [
  { label: "All", value: "all" },
  { label: "Blog", value: "blog" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Ad Copy", value: "ad" },
  { label: "Email", value: "email" },
];

export default function LibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");

      listContent({ type: filter, search, limit: 24 })
        .then((data) => {
          if (active) setItems(data.items);
        })
        .catch((requestError) => {
          if (active) {
            setItems([]);
            setError(requestError instanceof Error ? requestError.message : "Unable to load content.");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 120);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [filter, search]);

  const removeItem = async (id: string) => {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));

    try {
      await deleteContent(id);
    } catch (requestError) {
      setItems(previous);
      setError(requestError instanceof Error ? requestError.message : "Unable to delete content.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Your content garden ðŸ“š"
        description="Everything you've cultivated, organized and ready to revisit."
      />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your content..."
            className="bloom-field rounded-[var(--radius-pill)] py-3.5 pl-11 pr-4 text-[0.95rem]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "rounded-[var(--radius-pill)] border-[1.5px] px-4 py-2 text-sm font-medium transition-all duration-300",
                filter === option.value
                  ? "border-sage bg-sage text-white"
                  : "border-[rgba(91,122,84,0.24)] bg-white text-[var(--text-secondary)] hover:border-sage hover:text-sage dark:bg-[var(--bg-secondary)]"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-[var(--radius-md)] border border-terracotta/30 bg-terracotta-pale/50 px-4 py-3 text-sm font-medium text-terracotta">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <HistoryCard
            key={item.id}
            item={item}
            onDelete={removeItem}
            onOpen={(id) => router.push(`/content/${id}`)}
          />
        ))}
        {!loading && items.length === 0 && (
          <div className="col-span-full rounded-[var(--radius-md)] border border-[rgba(91,122,84,0.16)] bg-white/90 py-16 text-center text-[var(--text-secondary)] shadow-[var(--card-shadow)] dark:bg-[var(--bg-secondary)]">
            <p className="text-lg">No content found</p>
            <p className="mt-1 text-sm">Try adjusting your search, filters, or create something new.</p>
          </div>
        )}
        {loading && (
          <div className="col-span-full rounded-[var(--radius-md)] border border-[rgba(91,122,84,0.16)] bg-white/90 py-16 text-center text-[var(--text-secondary)] shadow-[var(--card-shadow)] dark:bg-[var(--bg-secondary)]">
            <span className="bloom-loading mx-auto mb-3 flex justify-center gap-1.5 text-sage"><span /><span /><span /></span>
            <p>Loading saved blooms...</p>
          </div>
        )}
      </div>
    </div>
  );
}
