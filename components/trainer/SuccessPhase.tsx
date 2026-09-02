import { PepperIcon } from "@/components/PepperIcon";
import type { ContrastItem, ReviewRating } from "@/types/plu";

const ratings: ReviewRating[] = ["again", "hard", "good", "easy"];
const intervals: Record<ReviewRating, string> = { again: "10 min", hard: "Tomorrow", good: "3 days", easy: "7 days" };

interface SuccessProps {
  code: string;
  contrast: ContrastItem[];
  onRate: (rating: ReviewRating) => void;
}

export function SuccessPhase({ code, contrast, onRate }: SuccessProps) {
  return (
    <section className="phase phase-success">
      <div className="success-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9.2 16.6-4.1-4.1 1.4-1.4 2.7 2.7 8.3-8.3 1.4 1.4-9.7 9.7Z" /></svg></div>
      <p className="eyebrow success"><span className="eyebrow-dot" /> Retrieved</p>
      <h2>{code} is locked in.</h2>
      <p className="lead compact">Now separate it from nearby pepper codes. Contrast appears only after the first correct recall.</p>
      <div className="family-strip" aria-label="Pepper family comparison">
        {contrast.map((item) => (
          <div className={`family-item${item.current ? " current" : ""}`} key={`${item.name}-${item.code}`}>
            <span className="family-icon"><PepperIcon item={item} /></span>
            <span><b>{item.name}</b><small>{item.code}</small></span>
          </div>
        ))}
      </div>
      <div className="rating-block">
        <div><strong>How did that feel?</strong><span>Your answer sets the next review.</span></div>
        <div className="rating-row">
          {ratings.map((rating) => (
            <button type="button" data-rating={rating} key={rating} onClick={() => onRate(rating)}>
              <b>{rating[0].toUpperCase() + rating.slice(1)}</b><small>{intervals[rating]}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
