export function CorrectionPhase({ name, code, onRetry }: { name: string; code: string; onRetry: () => void }) {
  return (
    <section className="phase phase-correction">
      <p className="eyebrow correction"><span className="eyebrow-dot" /> Correct the miss</p>
      <h2>Look once. Then retrieve it again.</h2>
      <p className="lead compact"><strong>{name}</strong> is:</p>
      <div className="code-teach correction-code">{code}</div>
      <p className="correction-copy">Do not keep guessing. Brief correction followed by immediate recall fixes the memory faster.</p>
      <button className="primary-button" type="button" onClick={onRetry}>
        Hide it and retry
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.3 5.3 1.4-1.4 8.1 8.1-8.1 8.1-1.4-1.4 5.7-5.7H4v-2h11l-5.7-5.7Z" /></svg>
      </button>
    </section>
  );
}
