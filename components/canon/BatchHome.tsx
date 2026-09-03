import Link from "next/link";
import { ArrowRight, Clock3, Layers3, Play, Sparkles } from "lucide-react";

import type { ProductBatch } from "@/types/batch";
import type { ProductStory } from "@/types/trace";
import { productTheme } from "@/lib/ui/product-theme";

export function BatchHome({ batch, stories }: { batch: ProductBatch; stories: ProductStory[] }) {
  const byCatalogId = new Map(stories.map((story) => [story.catalogId, story]));
  const ready = batch.items.filter((item) => item.status === "ready");
  const first = ready[0] ? byCatalogId.get(ready[0].catalogId) : undefined;

  return (
    <main className="batchPage">
      <header className="batchTopbar">
        <Link className="batchBrand" href="/" aria-label="PLU home">
          <img src="/icon.svg" alt="" aria-hidden="true" />
          <span><strong>PLU</strong><small>See it. Know it. Ring it.</small></span>
        </Link>
        <div className="batchCount" aria-label={`${ready.length} of ${batch.size} lessons ready`}>
          <span>{ready.length}</span><small>of {batch.size} ready</small>
        </div>
      </header>

      <section className="batchHero">
        <div>
          <p className="batchEyebrow"><Sparkles aria-hidden="true" /> First set</p>
          <h1>{batch.title}</h1>
          <p>Start with one close family, then widen the set as each product story is completed.</p>
        </div>
        {first && (
          <Link className="batchStart" href={`/learn/${first.id}/`}>
            <Play aria-hidden="true" />
            <span><small>Begin with</small><strong>{first.title}</strong></span>
            <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </section>

      <section className="batchSection" aria-labelledby="readyHeading">
        <div className="batchSectionHeading">
          <div><Layers3 aria-hidden="true" /><h2 id="readyHeading">Pepper family</h2></div>
          <span>{ready.length} lessons</span>
        </div>
        <div className="batchReadyGrid">
          {ready.map((item) => {
            const story = byCatalogId.get(item.catalogId);
            if (!story) return null;
            const hero = story.photos.find((photo) => photo.role === "hero") ?? story.photos[0];
            return (
              <Link className="batchLessonCard" style={productTheme(story)} href={`/learn/${story.id}/`} key={item.catalogId}>
                <img src={hero.src} alt="" aria-hidden="true" />
                <span className="batchLessonWash" aria-hidden="true" />
                <span className="batchLessonOrder">{String(item.order).padStart(2, "0")}</span>
                <span className="batchLessonCopy">
                  <small>{story.identity.form} · {story.checkout.soldBy}</small>
                  <strong>{story.title}</strong>
                  <b>{story.checkout.code}</b>
                </span>
                <span className="batchLessonGo" aria-hidden="true"><ArrowRight /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="batchSection batchQueue" aria-labelledby="queueHeading">
        <div className="batchSectionHeading">
          <div><Clock3 aria-hidden="true" /><h2 id="queueHeading">Coming next</h2></div>
          <span>{batch.size - ready.length} products</span>
        </div>
        <div className="batchQueueGrid">
          {batch.items.filter((item) => item.status === "queued").map((item) => (
            <article className="batchQueueCard" key={item.catalogId}>
              <span>{String(item.order).padStart(2, "0")}</span>
              <div><strong>{item.title}</strong><small>{item.family}</small></div>
              <Clock3 aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
