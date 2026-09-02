import type { ReviewRating } from "@/types/plu";

export const reviewIntervals: Record<
  ReviewRating,
  { label: string; minutes: number }
> = {
  again: { label: "Queued again in 10 minutes", minutes: 10 },
  hard: { label: "Scheduled for tomorrow", minutes: 60 * 24 },
  good: { label: "Scheduled in 3 days", minutes: 60 * 24 * 3 },
  easy: { label: "Scheduled in 7 days", minutes: 60 * 24 * 7 },
};

export function calculateNextReview(
  rating: ReviewRating,
  from = new Date(),
): Date {
  const interval = reviewIntervals[rating];
  return new Date(from.getTime() + interval.minutes * 60_000);
}
