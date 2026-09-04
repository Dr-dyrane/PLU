"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Layers3,
  LoaderCircle,
  Play,
  Search,
  SearchX,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import {
  HomeFilterSheet,
  type LearningFilter,
  type SoldFilter,
} from "@/components/canon/HomeFilterSheet";
import { productTheme } from "@/lib/ui/product-theme";
import type { BatchItem, BatchStorySummary, ProductBatch } from "@/types/batch";

type CategoryFilter = "all" | "peppers" | "fruit" | "vegetables" | "herbs" | "other";

type ProgressiveWindow = {
  key: string;
  count: number;
};

const INITIAL_VISIBLE_LESSONS = 18;
const LESSON_LOAD_INCREMENT = 18;

const categories: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "peppers", label: "Peppers" },
  { value: "fruit", label: "Fruit" },
  { value: "vegetables", label: "Vegetables" },
  { value: "herbs", label: "Herbs" },
  { value: "other", label: "Other" },
];

const fruitFamilies = new Set([
  "apples",
  "avocados",
  "bananas",
  "berries",
  "citrus",
  "grapes",
  "mangoes",
  "melons",
  "pears",
  "pineapples",
  "stone fruit",
  "tropical fruit",
  "watermelons",
]);

function categoryFor(item: BatchItem): Exclude<CategoryFilter, "all"> {
  const family = item.family.trim().toLowerCase();
  if (family === "peppers") return "peppers";
  if (family === "herbs") return "herbs";
  if (family === "source review") return "other";
  if (fruitFamilies.has(family)) return "fruit";
  return "vegetables";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function readCompleted(stories: BatchStorySummary[]) {
  const completed = new Set<string>();
  for (const story of stories) {
    try {
      if (window.localStorage.getItem(`plu:complete:${story.id}`)) completed.add(story.id);
    } catch {
      return completed;
    }
  }
  return completed;
}

export function BatchHome({ batch, stories }: { batch: ProductBatch; stories: BatchStorySummary[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sold, setSold] = useState<SoldFilter>("all");
  const [learning, setLearning] = useState<LearningFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAllQueued, setShowAllQueued] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [urlReady, setUrlReady] = useState(false);
  const [progressiveWindow, setProgressiveWindow] = useState<ProgressiveWindow>({
    key: "",
    count: INITIAL_VISIBLE_LESSONS,
  });
  const pageRef = useRef<HTMLElement | null>(null);
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const loadSentinelRef = useRef<HTMLDivElement | null>(null);

  const byCatalogId = useMemo(
    () => new Map(stories.map((story) => [story.catalogId, story])),
    [stories],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextCategory = params.get("category") as CategoryFilter | null;
    const nextSold = params.get("sold") as SoldFilter | null;
    const nextLearning = params.get("learning") as LearningFilter | null;

    setQuery(params.get("q") ?? "");
    if (categories.some((item) => item.value === nextCategory)) setCategory(nextCategory!);
    if (["all", "weight", "each"].includes(nextSold ?? "")) setSold(nextSold!);
    if (["all", "ready", "learned", "queued"].includes(nextLearning ?? "")) {
      setLearning(nextLearning!);
    }
    setCompletedIds(readCompleted(stories));
    setUrlReady(true);

    const refresh = () => setCompletedIds(readCompleted(stories));
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [stories]);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("category", category);
    if (sold !== "all") params.set("sold", sold);
    if (learning !== "all") params.set("learning", learning);
    const next = params.size
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", next);
  }, [category, learning, query, sold, urlReady]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    page.inert = filterOpen;
    if (filterOpen) page.setAttribute("aria-hidden", "true");
    else page.removeAttribute("aria-hidden");
  }, [filterOpen]);

  const records = useMemo(
    () =>
      batch.items.map((item) => {
        const story = byCatalogId.get(item.catalogId);
        const learned = Boolean(story && completedIds.has(story.id));
        const searchText = normalize(
          [
            item.title,
            item.code,
            item.family,
            item.queueReason ?? "",
            ...(item.queueReasonCodes ?? []),
            story?.title ?? "",
            story?.shortTitle ?? "",
            story?.identity.form ?? "",
            story?.identity.color ?? "",
            story?.identity.variant ?? "",
            story?.checkout.saleForm ?? "",
            story?.checkout.soldBy ?? "",
          ].join(" "),
        );

        return { item, story, learned, category: categoryFor(item), searchText };
      }),
    [batch.items, byCatalogId, completedIds],
  );

  const filtered = useMemo(() => {
    const needle = normalize(query);
    return records.filter((record) => {
      if (needle && !record.searchText.includes(needle)) return false;
      if (category !== "all" && record.category !== category) return false;

      if (sold !== "all") {
        if (!record.story) return false;
        if (normalize(record.story.checkout.soldBy) !== sold) return false;
      }

      if (learning === "ready" && (record.item.status !== "ready" || record.learned)) return false;
      if (learning === "learned" && !record.learned) return false;
      if (learning === "queued" && record.item.status !== "queued") return false;

      return true;
    });
  }, [category, learning, query, records, sold]);

  const ready = filtered.filter((record) => record.item.status === "ready" && record.story);
  const queued = filtered.filter((record) => record.item.status === "queued");
  const allReady = records.filter((record) => record.item.status === "ready" && record.story);
  const learnedCount = records.filter((record) => record.learned).length;
  const first = allReady.find((record) => !record.learned) ?? allReady[0];
  const visibleQueued =
    showAllQueued || query.trim() || learning === "queued" || category !== "all" || sold !== "all"
      ? queued
      : queued.slice(0, 4);
  const hiddenQueued = Math.max(0, queued.length - visibleQueued.length);
  const activeFilterCount = Number(sold !== "all") + Number(learning !== "all");
  const hasDiscoveryState = Boolean(
    query.trim() || category !== "all" || sold !== "all" || learning !== "all",
  );
  const visibilityKey = `${batch.id}|${normalize(query)}|${category}|${sold}|${learning}`;
  const visibleReadyCount =
    progressiveWindow.key === visibilityKey
      ? progressiveWindow.count
      : INITIAL_VISIBLE_LESSONS;
  const visibleReady = ready.slice(0, visibleReadyCount);
  const hasMoreReady = visibleReady.length < ready.length;

  const loadMoreReady = () => {
    setProgressiveWindow((current) => {
      const currentCount =
        current.key === visibilityKey ? current.count : INITIAL_VISIBLE_LESSONS;
      return {
        key: visibilityKey,
        count: Math.min(currentCount + LESSON_LOAD_INCREMENT, ready.length),
      };
    });
  };

  useEffect(() => {
    const sentinel = loadSentinelRef.current;
    if (!sentinel || !hasMoreReady || !("IntersectionObserver" in window)) return;

    let advanced = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (advanced || !entries.some((entry) => entry.isIntersecting)) return;
        advanced = true;
        setProgressiveWindow((current) => {
          const currentCount =
            current.key === visibilityKey ? current.count : INITIAL_VISIBLE_LESSONS;
          return {
            key: visibilityKey,
            count: Math.min(currentCount + LESSON_LOAD_INCREMENT, ready.length),
          };
        });
      },
      {
        root: null,
        rootMargin: "850px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreReady, ready.length, visibilityKey, visibleReady.length]);

  const closeFilters = () => {
    setFilterOpen(false);
    requestAnimationFrame(() => filterTriggerRef.current?.focus({ preventScroll: true }));
  };

  const clearDiscovery = () => {
    setQuery("");
    setCategory("all");
    setSold("all");
    setLearning("all");
    setShowAllQueued(false);
  };

  return (
    <>
      <main className="batchPage" ref={pageRef}>
        <header className="batchTopbar">
          <Link className="batchBrand" href="/" aria-label="PLU home">
            <img src="/icon.svg" alt="" aria-hidden="true" />
            <span>
              <strong>PLU</strong>
              <small>See it. Know it. Ring it.</small>
            </span>
          </Link>
          <div
            className="batchCount"
            aria-label={`${learnedCount} learned, ${allReady.length} ready, ${batch.size} total`}
          >
            <span>{learnedCount}</span>
            <small>learned · {allReady.length} ready</small>
          </div>
        </header>

        <section className="batchHero">
          <div>
            <p className="batchEyebrow">
              <Sparkles aria-hidden="true" /> {batch.title}
            </p>
            <h1>Know it at a glance.</h1>
            <p>Learn the visual difference first. Then make the checkout code automatic.</p>
          </div>
          {first?.story && (
            <Link className="batchStart" href={`/learn/${first.story.id}/`}>
              <Play aria-hidden="true" />
              <span>
                <small>{first.learned ? "Review" : learnedCount ? "Continue with" : "Begin with"}</small>
                <strong>{first.story.title}</strong>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </section>

        <section className="batchDiscovery" aria-label="Find lessons">
          <div className="batchSearchRow">
            <label className="batchSearch">
              <Search aria-hidden="true" />
              <span className="srOnly">Search products or PLU codes</span>
              <input
                type="search"
                value={query}
                placeholder="Search product or PLU"
                autoComplete="off"
                spellCheck={false}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
                  <X aria-hidden="true" />
                </button>
              )}
            </label>
            <button
              ref={filterTriggerRef}
              className={`batchFilterButton${activeFilterCount ? " active" : ""}`}
              type="button"
              aria-label={
                activeFilterCount ? `Filters, ${activeFilterCount} active` : "Filter lessons"
              }
              onClick={() => setFilterOpen(true)}
            >
              <Filter aria-hidden="true" />
              <span>Filter</span>
              {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
            </button>
          </div>

          <div className="batchCategoryRail" role="group" aria-label="Product category">
            {categories.map((item) => (
              <button
                className={category === item.value ? "active" : ""}
                type="button"
                aria-pressed={category === item.value}
                onClick={() => setCategory(item.value)}
                key={item.value}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className="batchResultCount" aria-live="polite">
            {filtered.length === 1 ? "1 product" : `${filtered.length} products`}
          </p>
        </section>

        {ready.length > 0 && (
          <section className="batchSection" aria-labelledby="readyHeading">
            <div className="batchSectionHeading">
              <div>
                <Layers3 aria-hidden="true" />
                <h2 id="readyHeading">Ready to learn</h2>
              </div>
              <span>{ready.length} {ready.length === 1 ? "lesson" : "lessons"}</span>
            </div>
            <div className="batchReadyGrid">
              {visibleReady.map(({ item, story, learned }, index) => {
                if (!story) return null;
                return (
                  <Link
                    className="batchLessonCard"
                    style={productTheme(story)}
                    href={`/learn/${story.id}/`}
                    key={item.catalogId}
                  >
                    <img
                      src={story.hero.src}
                      alt=""
                      aria-hidden="true"
                      loading={index < 6 ? "eager" : "lazy"}
                      decoding="async"
                      fetchPriority={index < 3 ? "high" : "auto"}
                    />
                    <span className="batchLessonWash" aria-hidden="true" />
                    <span className="batchLessonOrder">{String(item.order).padStart(3, "0")}</span>
                    {learned && (
                      <span className="batchLearnedBadge">
                        <CheckCircle2 aria-hidden="true" /> Learned
                      </span>
                    )}
                    <span className="batchLessonCopy">
                      <small>{story.identity.form} · {story.checkout.soldBy}</small>
                      <strong>{story.title}</strong>
                      <b>{story.checkout.code}</b>
                    </span>
                    <span className="batchLessonGo" aria-hidden="true">
                      <ArrowRight />
                    </span>
                  </Link>
                );
              })}
            </div>

            <div
              className={`batchProgressiveLoader${hasMoreReady ? " active" : " complete"}`}
              ref={loadSentinelRef}
              aria-live="polite"
            >
              {hasMoreReady ? (
                <button type="button" onClick={loadMoreReady}>
                  <LoaderCircle aria-hidden="true" />
                  <span>Keep scrolling</span>
                  <small>
                    {visibleReady.length} of {ready.length} loaded
                  </small>
                </button>
              ) : (
                <p>
                  <CheckCircle2 aria-hidden="true" />
                  <span>All {ready.length} lessons loaded</span>
                </p>
              )}
            </div>
          </section>
        )}

        {queued.length > 0 && (
          <section className="batchSection batchQueue" aria-labelledby="queueHeading">
            <div className="batchSectionHeading">
              <div>
                <Clock3 aria-hidden="true" />
                <h2 id="queueHeading">Needs source review</h2>
              </div>
              <button
                className="batchQueueToggle"
                type="button"
                aria-expanded={showAllQueued}
                onClick={() => setShowAllQueued((value) => !value)}
              >
                {showAllQueued ? "Show less" : `View all ${queued.length}`}
                <ChevronDown aria-hidden="true" />
              </button>
            </div>
            <div className="batchQueueGrid">
              {visibleQueued.map(({ item }) => (
                <article className="batchQueueCard" key={item.catalogId}>
                  <span>{String(item.order).padStart(3, "0")}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.queueReason ?? item.family}</small>
                  </div>
                  <Clock3 aria-hidden="true" />
                </article>
              ))}
              {hiddenQueued > 0 && (
                <button
                  className="batchQueueMore"
                  type="button"
                  onClick={() => setShowAllQueued(true)}
                >
                  <span>+{hiddenQueued}</span>
                  <small>more in {batch.title}</small>
                </button>
              )}
            </div>
          </section>
        )}

        {!ready.length && !queued.length && (
          <section className="batchEmpty" aria-live="polite">
            <SearchX aria-hidden="true" />
            <h2>No match yet.</h2>
            <p>Try a product name, family, or PLU code.</p>
            {hasDiscoveryState && (
              <button type="button" onClick={clearDiscovery}>
                Clear search and filters
              </button>
            )}
          </section>
        )}
      </main>

      <HomeFilterSheet
        open={filterOpen}
        sold={sold}
        learning={learning}
        onSold={setSold}
        onLearning={setLearning}
        onClear={() => {
          setSold("all");
          setLearning("all");
        }}
        onClose={closeFilters}
      />
    </>
  );
}
