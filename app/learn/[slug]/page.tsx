import { notFound } from "next/navigation";

import { PluLesson } from "@/components/canon/PluLesson";
import { productStories, productStoryById } from "@/data/stories";
import { productTheme } from "@/lib/ui/product-theme";

export const dynamicParams = false;

export function generateStaticParams() {
  return productStories.map((story) => ({ slug: story.id }));
}

export default async function ProductLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = productStoryById.get(slug);
  if (!story) notFound();

  return (
    <div className="productTheme" style={productTheme(story)}>
      <PluLesson story={story} />
    </div>
  );
}
