const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "delete"] as const;

interface RecallProps {
  codeLength: number;
  entry: string;
  hint: string;
  hintShown: boolean;
  shaking: boolean;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onToggleHint: () => void;
  onSubmit: () => void;
}

export function RecallPhase(props: RecallProps) {
  const { codeLength, entry, hint, hintShown, shaking, onDigit, onDelete, onClear, onToggleHint, onSubmit } = props;
  return (
    <section className="phase phase-recall">
      <p className="eyebrow"><span className="eyebrow-dot" /> Active recall</p>
      <h2>What is the PLU?</h2>
      <p className="lead compact">Use the image only. Type four digits or tap the keypad.</p>
      <div className="code-slots" aria-label={`${codeLength} digit code entry`}>
        {Array.from({ length: codeLength }, (_, index) => {
          const value = entry[index] ?? "";
          const cursor = index === entry.length && entry.length < codeLength;
          const classes = [value ? "filled" : "", cursor ? "cursor" : "", shaking ? "shake" : ""].filter(Boolean).join(" ");
          return <span key={index} className={classes}>{value}</span>;
        })}
      </div>
      {hintShown && (
        <div className="hint-box">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21h6v-1H9v1Zm3-20a7 7 0 0 0-4 12.2V17h8v-3.3A7 7 0 0 0 12 1Zm2.2 11.6-.2.1V15h-4v-2.3l-.2-.1A5 5 0 1 1 14.2 12.6Z" /></svg>
          <span>{hint}</span>
        </div>
      )}
      <div className="keypad" aria-label="Numeric keypad">
        {keypad.map((value) => (
          <button className={value === "clear" || value === "delete" ? "delete" : ""} type="button" key={value}
            aria-label={value === "delete" ? "Delete last digit" : value === "clear" ? "Clear code" : `Digit ${value}`}
            onClick={() => /^\d$/.test(value) ? onDigit(value) : value === "delete" ? onDelete() : onClear()}>
            {value === "delete" ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.4 5H21v14H9.4L3 12l6.4-7Zm.9 2L5.7 12l4.6 5H19V7h-8.7Zm1.1 2.6 2.1 2.1 2.1-2.1 1.4 1.4-2.1 2.1 2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1-2.1-2.1 1.4-1.4Z" /></svg>
            ) : value === "clear" ? "C" : value}
          </button>
        ))}
      </div>
      <div className="recall-actions">
        <button className="text-button" type="button" onClick={onToggleHint}>{hintShown ? "Hide visual hint" : "Show visual hint"}</button>
        <button className="primary-button check-button" type="button" disabled={entry.length !== codeLength} onClick={onSubmit}>Check</button>
      </div>
    </section>
  );
}
