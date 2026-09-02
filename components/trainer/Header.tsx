interface HeaderProps {
  sequence: number;
  deckSize: number;
  progress: number;
  onReset: () => void;
}

export function Header({ sequence, deckSize, progress, onReset }: HeaderProps) {
  return (
    <header className="topbar">
      <a className="brand" href="#lesson" aria-label="PLU Visual Recall home">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img">
            <path d="M7 4.5c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v1.2c1.9.8 3.2 2.7 3.2 4.9 0 2.2-1.3 4.1-3.2 4.9v1.9c0 2.3-1.9 4.1-4.2 4.1h-1.6C8.9 21.5 7 19.7 7 17.4v-1.9c-1.9-.8-3.2-2.7-3.2-4.9 0-2.2 1.3-4.1 3.2-4.9V4.5Z" />
          </svg>
        </span>
        <span>
          <strong>PLU Visual</strong>
          <small>See it. Recall it.</small>
        </span>
      </a>

      <div className="top-progress" aria-label="Lesson progress">
        <span>Card {sequence} of {deckSize}</span>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <button className="quiet-button" type="button" title="Reset this lesson" onClick={onReset}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.9 7.4A8.5 8.5 0 1 1 3.5 12h2A6.5 6.5 0 1 0 7 7.8l2.4 2.4H3V3.8l1.9 1.9v1.7Z" />
        </svg>
        <span>Reset</span>
      </button>
    </header>
  );
}
