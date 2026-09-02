interface ObserveProps {
  name: string;
  code: string;
  chunks: string[];
  onStart: () => void;
}

export function ObservePhase({ name, code, chunks, onStart }: ObserveProps) {
  return (
    <section className="phase phase-observe">
      <p className="eyebrow"><span className="eyebrow-dot" /> First impression</p>
      <h1>{name}</h1>
      <p className="lead">See the produce, say its name, then say the code once. The code disappears when you begin.</p>
      <div className="code-teach" aria-label={`PLU code ${code}`}>
        {chunks.map((chunk, index) => (
          <span key={`${chunk}-${index}`}>{index > 0 && <i aria-hidden="true" />}<b>{chunk}</b></span>
        ))}
      </div>
      <p className="chunk-caption">Learn it as small chunks: <strong>{chunks.join(" · ")}</strong></p>
      <button className="primary-button" type="button" onClick={onStart}>
        Hide the code. Test me
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.3 5.3 1.4-1.4 8.1 8.1-8.1 8.1-1.4-1.4 5.7-5.7H4v-2h11l-5.7-5.7Z" /></svg>
      </button>
    </section>
  );
}
