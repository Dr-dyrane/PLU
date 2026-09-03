"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  compileCheckoutPath,
  firstDifferentDigit,
  keypadRows,
  toneForDigit,
} from "@/lib/trace/code-path";
import {
  competenceScore,
  createInitialLearningState,
  inferCompetenceOutcome,
  reduceLearningState,
} from "@/lib/trace/learning-engine";
import type {
  CheckoutPath,
  ClassificationPrompt,
  CompetenceOutcome,
  KeypadLayoutName,
  LearningEvent,
  ProductStory,
  TraceStage,
} from "@/types/trace";

type LearningEventPayload = LearningEvent extends infer Event
  ? Event extends { id: string }
    ? Omit<Event, "id">
    : never
  : never;

type Reaction = { kind: "good" | "soft" | "warn"; text: string } | null;
type StoryTab = "identity" | "checkout" | "neighbors";

const stageOrder: TraceStage[] = [
  "meet",
  "resolve",
  "attach",
  "trace",
  "recall",
  "repair",
  "complete",
];

const learningSteps: TraceStage[] = ["meet", "resolve", "attach", "trace", "recall"];

function stageProgress(stage: TraceStage): number {
  if (stage === "repair") return 5;
  if (stage === "complete") return 5;
  const index = learningSteps.indexOf(stage);
  return index < 0 ? 1 : index + 1;
}

function useSensoryFeedback(enabled: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);

  const ensureAudio = useCallback(() => {
    if (!enabled || typeof window === "undefined") return null;
    const audioWindow = window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioConstructor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioConstructor();
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, [enabled]);

  const tone = useCallback(
    (digit: string, duration = 0.07, gainValue = 0.035) => {
      const context = ensureAudio();
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = toneForDigit(digit);
      gain.gain.setValueAtTime(gainValue, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    },
    [ensureAudio],
  );

  const success = useCallback(() => {
    const context = ensureAudio();
    if (context) {
      ["4", "7", "9"].forEach((digit, index) => {
        window.setTimeout(() => tone(digit, 0.12, 0.045), index * 70);
      });
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([18, 35, 32]);
    }
  }, [ensureAudio, tone]);

  const soft = useCallback(
    (digit?: string) => {
      if (digit) tone(digit, 0.055, 0.025);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    },
    [tone],
  );

  const warning = useCallback(() => {
    const context = ensureAudio();
    if (context) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = 145;
      gain.gain.setValueAtTime(0.035, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.11);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.11);
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([28, 25, 28]);
    }
  }, [ensureAudio]);

  return { tone, success, soft, warning };
}

function BrandMark() {
  return (
    <span className="trace-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M7.2 4.9c0-1.2 1-2.2 2.2-2.2h5.2c1.2 0 2.2 1 2.2 2.2v1c2 .9 3.4 2.8 3.4 5.1 0 2.4-1.4 4.4-3.4 5.2v1.1c0 2.3-1.9 4.1-4.2 4.1h-1.2a4.1 4.1 0 0 1-4.2-4.1v-1.1A5.6 5.6 0 0 1 3.8 11c0-2.3 1.4-4.2 3.4-5.1v-1Zm2.1 1.2h5.4V4.9H9.3v1.2Zm2.7 3a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Z" />
      </svg>
    </span>
  );
}

function ProgressDots({ stage }: { stage: TraceStage }) {
  const progress = stageProgress(stage);
  return (
    <div className="trace-progress" aria-label={`Learning step ${progress} of 5`}>
      <span className="trace-progress-label">Step {progress} of 5</span>
      <div className="trace-dots" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <i key={index} className={index < progress ? "active" : ""} />
        ))}
      </div>
    </div>
  );
}

function ReactionBubble({ reaction }: { reaction: Reaction }) {
  return (
    <div
      className={`trace-reaction${reaction ? ` show ${reaction.kind}` : ""}`}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">{reaction?.kind === "warn" ? "↺" : "✓"}</span>
      {reaction?.text ?? ""}
    </div>
  );
}

function KeypadPath({
  path,
  entry,
  interactive,
  showPath,
  activeChunk,
  onDigit,
  compact = false,
}: {
  path: CheckoutPath;
  entry: string;
  interactive: boolean;
  showPath: boolean;
  activeChunk?: number;
  onDigit?: (digit: string) => void;
  compact?: boolean;
}) {
  const acceptedIndices = new Set(Array.from({ length: entry.length }, (_, index) => index));

  return (
    <div className={`trace-keypad${compact ? " compact" : ""}`}>
      <svg className="trace-path-layer" viewBox="0 0 300 400" aria-hidden="true">
        {showPath &&
          path.segments.map((segment) => {
            if (activeChunk !== undefined && segment.chunkIndex !== activeChunk) return null;
            const pointString = segment.points.map((point) => `${point.x},${point.y}`).join(" ");
            return (
              <g key={`${segment.chunk}-${segment.chunkIndex}`}>
                {segment.points.length > 1 ? (
                  <polyline
                    className={`trace-segment segment-${segment.chunkIndex}`}
                    points={pointString}
                  />
                ) : (
                  <circle
                    className={`trace-single-point segment-${segment.chunkIndex}`}
                    cx={segment.points[0].x}
                    cy={segment.points[0].y}
                    r="26"
                  />
                )}
                {segment.points.map((point) => (
                  <circle
                    className={`trace-path-point segment-${segment.chunkIndex}`}
                    key={`${segment.chunkIndex}-${point.index}`}
                    cx={point.x}
                    cy={point.y}
                    r="8"
                  />
                ))}
              </g>
            );
          })}
      </svg>

      <div className="trace-key-grid">
        {keypadRows[path.layout].flatMap((row, rowIndex) =>
          row.map((digit, columnIndex) => {
            if (!digit) {
              return <span className="trace-key-spacer" key={`spacer-${rowIndex}-${columnIndex}`} />;
            }

            const pathIndices = path.points
              .filter((point) => point.digit === digit)
              .map((point) => point.index);
            const accepted = pathIndices.some((index) => acceptedIndices.has(index));
            const nextDigit = path.digits[entry.length] === digit;

            return (
              <button
                type="button"
                className={`trace-key${accepted ? " accepted" : ""}${
                  interactive && nextDigit ? " next" : ""
                }`}
                disabled={!interactive}
                onClick={() => onDigit?.(digit)}
                key={digit}
                aria-label={`Digit ${digit}`}
              >
                {digit}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

function CodeSlots({ codeLength, entry, error }: { codeLength: number; entry: string; error?: boolean }) {
  return (
    <div className={`trace-code-slots${error ? " error" : ""}`} aria-label={`${codeLength} digit code`}>
      {Array.from({ length: codeLength }, (_, index) => (
        <span
          key={index}
          className={`${entry[index] ? "filled" : ""}${
            index === entry.length && entry.length < codeLength ? " cursor" : ""
          }`}
        >
          {entry[index] ?? ""}
        </span>
      ))}
    </div>
  );
}

function StorySheet({
  story,
  dialogRef,
  activeTab,
  onTab,
  onClose,
}: {
  story: ProductStory;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  activeTab: StoryTab;
  onTab: (tab: StoryTab) => void;
  onClose: () => void;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="trace-sheet"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="trace-sheet-card">
        <div className="trace-sheet-handle" aria-hidden="true" />
        <header className="trace-sheet-header">
          <div>
            <span>Product story</span>
            <h2>{story.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close product story">×</button>
        </header>

        <nav className="trace-sheet-tabs" aria-label="Product story sections">
          {(["identity", "checkout", "neighbors"] as StoryTab[]).map((tab) => (
            <button
              type="button"
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => onTab(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        <div className="trace-sheet-body">
          {activeTab === "identity" && (
            <div className="trace-story-list">
              {story.storyBeats.map((beat) => (
                <article key={beat.id}>
                  <span>{beat.label}</span>
                  <strong>{beat.value}</strong>
                  <p>{beat.copy}</p>
                </article>
              ))}
            </div>
          )}

          {activeTab === "checkout" && (
            <div className="trace-variant-list">
              <p className="trace-sheet-intro">{story.checkout.summary}</p>
              {story.retailVariants.map((variant) => (
                <article className={variant.scope === "primary" ? "primary" : ""} key={variant.id}>
                  <div>
                    <span>{variant.scope.replaceAll("-", " ")}</span>
                    <strong>{variant.name}</strong>
                    <p>{variant.note}</p>
                  </div>
                  <b>{variant.code}</b>
                </article>
              ))}
            </div>
          )}

          {activeTab === "neighbors" && (
            <div className="trace-relation-list">
              {story.codeRelations.map((relation) => (
                <article key={`${relation.kind}-${relation.title}`}>
                  <span>{relation.kind.replaceAll("-", " ")}</span>
                  <strong>{relation.title}</strong>
                  <p>{relation.copy}</p>
                </article>
              ))}
              <article className="trace-nearest">
                <span>nearest visual confusion</span>
                <strong>{story.nearestConfusion.name} · {story.nearestConfusion.code}</strong>
                <p>{story.nearestConfusion.cue}</p>
              </article>
            </div>
          )}
        </div>

        <footer className="trace-sheet-source">
          <span>{story.source.confidence.replaceAll("-", " ")}</span>
          <small>
            Primary sheet {story.source.primaryPages.join(", ")} · related sheet {story.source.relatedPages.join(", ")}
          </small>
        </footer>
      </section>
    </dialog>
  );
}

function IdentityPrompt({
  prompt,
  promptIndex,
  total,
  wrongChoice,
  locked,
  onChoice,
}: {
  prompt: ClassificationPrompt;
  promptIndex: number;
  total: number;
  wrongChoice: string | null;
  locked: boolean;
  onChoice: (choice: string) => void;
}) {
  return (
    <section className="trace-phase trace-resolve-phase">
      <p className="trace-eyebrow"><span /> Resolve · {promptIndex + 1}/{total}</p>
      <h1>{prompt.question}</h1>
      <p className="trace-lead">{prompt.support}</p>
      <div className="trace-choice-grid">
        {prompt.choices.map((choice) => (
          <button
            type="button"
            key={choice.id}
            disabled={locked}
            className={wrongChoice === choice.id ? "wrong" : ""}
            onClick={() => onChoice(choice.id)}
          >
            <span>{choice.label}</span>
            <i aria-hidden="true">→</i>
          </button>
        ))}
      </div>
    </section>
  );
}

function OutcomeCopy({ outcome }: { outcome: CompetenceOutcome }) {
  if (outcome === "clean") {
    return <><strong>Clean retrieval</strong><span>No recovery cue was needed.</span></>;
  }
  if (outcome === "guided") {
    return <><strong>Guided retrieval</strong><span>The path helped; direct recall is next.</span></>;
  }
  return <><strong>Recovered well</strong><span>A miss was corrected and retrieved again.</span></>;
}

export function TraceTrainer({ story }: { story: ProductStory }) {
  const [state, dispatch] = useReducer(
    reduceLearningState,
    undefined,
    createInitialLearningState,
  );
  const [promptIndex, setPromptIndex] = useState(0);
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [identityLocked, setIdentityLocked] = useState(false);
  const [traceEntry, setTraceEntry] = useState("");
  const [recallEntry, setRecallEntry] = useState("");
  const [repairIndex, setRepairIndex] = useState(0);
  const [reaction, setReaction] = useState<Reaction>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [layout, setLayout] = useState<KeypadLayoutName>("calculator");
  const [storyTab, setStoryTab] = useState<StoryTab>("identity");
  const sheetRef = useRef<HTMLDialogElement | null>(null);
  const eventCounter = useRef(0);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensory = useSensoryFeedback(soundEnabled);
  const path = useMemo(
    () => compileCheckoutPath(story.checkout.code, layout),
    [layout, story.checkout.code],
  );

  const send = useCallback(
    (payload: LearningEventPayload) => {
      const event = {
        ...payload,
        id: `${story.id}:${eventCounter.current++}:${payload.type}`,
      } as LearningEvent;
      dispatch(event);
    },
    [story.id],
  );

  const showReaction = useCallback((next: Reaction) => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setReaction(next);
    reactionTimer.current = setTimeout(() => setReaction(null), 1150);
  }, []);

  useEffect(() => {
    try {
      const storedLayout = window.localStorage.getItem("plu-trace:keypad-layout");
      if (storedLayout === "calculator" || storedLayout === "phone") {
        setLayout(storedLayout);
      }
      const storedSound = window.localStorage.getItem("plu-trace:sound");
      if (storedSound === "off") setSoundEnabled(false);
    } catch {
      // The lesson remains fully usable when storage is restricted.
    }

    return () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("plu-trace:keypad-layout", layout);
    } catch {
      // Ignore restricted storage.
    }
  }, [layout]);

  useEffect(() => {
    try {
      window.localStorage.setItem("plu-trace:sound", soundEnabled ? "on" : "off");
    } catch {
      // Ignore restricted storage.
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (!state.completed) return;
    try {
      window.localStorage.setItem(
        `plu-trace:v0.2:${story.id}`,
        JSON.stringify({
          completedAt: new Date().toISOString(),
          outcome: inferCompetenceOutcome(state),
          score: competenceScore(state),
          identityMisses: state.identityMisses,
          traceMisses: state.traceMisses,
          recallMisses: state.recallMisses,
          supportUses: state.supportUses,
        }),
      );
    } catch {
      // Persistence is an enhancement, not a dependency.
    }
  }, [state, story.id]);

  const openStory = useCallback(
    (tab: StoryTab = "identity") => {
      setStoryTab(tab);
      if (state.stage === "recall" || state.stage === "repair") {
        send({ type: "SUPPORT_OPENED" });
      }
      if (!sheetRef.current?.open) sheetRef.current?.showModal();
    },
    [send, state.stage],
  );

  const closeStory = useCallback(() => sheetRef.current?.close(), []);

  const handleIdentityChoice = (choice: string) => {
    if (identityLocked) return;
    const prompt = story.classificationPrompts[promptIndex];
    const correct = choice === prompt.answer;
    send({ type: "IDENTITY_RESPONSE", correct });

    if (!correct) {
      setWrongChoice(choice);
      sensory.warning();
      showReaction({ kind: "warn", text: "Look at the product branch again" });
      window.setTimeout(() => setWrongChoice(null), 520);
      return;
    }

    setIdentityLocked(true);
    sensory.soft(String(promptIndex + 2));
    showReaction({ kind: "good", text: promptIndex === 0 ? "Family resolved" : "That narrows it" });

    window.setTimeout(() => {
      if (promptIndex === story.classificationPrompts.length - 1) {
        send({ type: "IDENTITY_COMPLETE" });
      } else {
        setPromptIndex((index) => index + 1);
      }
      setIdentityLocked(false);
    }, 520);
  };

  const beginTrace = () => {
    setTraceEntry("");
    sensory.soft("4");
    send({ type: "BEGIN_TRACE" });
  };

  const handleTraceDigit = (digit: string) => {
    const expected = path.digits[traceEntry.length];
    if (digit !== expected) {
      send({ type: "TRACE_RESPONSE", correct: false });
      sensory.warning();
      showReaction({ kind: "warn", text: `The next key is ${expected}` });
      window.setTimeout(() => setTraceEntry(""), 430);
      return;
    }

    const next = `${traceEntry}${digit}`;
    setTraceEntry(next);
    sensory.soft(digit);

    if (next.length === path.digits.length) {
      showReaction({ kind: "good", text: "Checkout path built" });
      window.setTimeout(() => {
        setRecallEntry("");
        send({ type: "TRACE_RESPONSE", correct: true });
      }, 520);
    }
  };

  const handleRecallDigit = (digit: string) => {
    if (recallEntry.length >= path.digits.length) return;
    setRecallEntry((entry) => `${entry}${digit}`);
    sensory.tone(digit, 0.05, 0.02);
  };

  const deleteRecallDigit = () => setRecallEntry((entry) => entry.slice(0, -1));

  const submitRecall = useCallback(() => {
    if (recallEntry.length !== path.digits.length) return;
    const correct = recallEntry === story.checkout.code;
    send({ type: "RECALL_RESPONSE", correct });

    if (correct) {
      sensory.success();
      showReaction({ kind: "good", text: "One clean retrieval" });
      return;
    }

    const difference = firstDifferentDigit(story.checkout.code, recallEntry);
    setRepairIndex(Math.max(0, difference));
    sensory.warning();
    showReaction({ kind: "warn", text: "Repair the first broken chunk" });
  }, [path.digits.length, recallEntry, send, sensory, showReaction, story.checkout.code]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!/^\d$/.test(event.key) && event.key !== "Backspace" && event.key !== "Enter") return;

      if (state.stage === "trace" && /^\d$/.test(event.key)) {
        handleTraceDigit(event.key);
      }

      if (state.stage === "recall") {
        if (/^\d$/.test(event.key)) handleRecallDigit(event.key);
        if (event.key === "Backspace") deleteRecallDigit();
        if (event.key === "Enter") submitRecall();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [state.stage, traceEntry, recallEntry, submitRecall, path.digits.length]);

  const retryRecall = () => {
    setRecallEntry("");
    send({ type: "RETRY" });
  };

  const reset = () => {
    setPromptIndex(0);
    setWrongChoice(null);
    setIdentityLocked(false);
    setTraceEntry("");
    setRecallEntry("");
    setRepairIndex(0);
    send({ type: "RESET" });
    showReaction({ kind: "soft", text: "Lesson reset" });
  };

  const toggleSound = () => {
    setSoundEnabled((enabled) => !enabled);
    showReaction({ kind: "soft", text: soundEnabled ? "Sound off" : "Sound on" });
  };

  const repairPoint = path.points[repairIndex] ?? path.points[0];
  const repairChunk = path.segments[repairPoint.chunkIndex];
  const outcome = inferCompetenceOutcome(state);
  const score = competenceScore(state);
  const revealedBeatCount = Math.min(
    story.storyBeats.length,
    state.stage === "meet" ? 1 : state.stage === "resolve" ? promptIndex + 2 : story.storyBeats.length,
  );

  return (
    <main className={`trace-app stage-${state.stage}`}>
      <header className="trace-header">
        <a href="#trace-workspace" className="trace-brand" aria-label="PLU Trace home">
          <BrandMark />
          <span><strong>PLU Trace</strong><small>Read it. Trace it. Recall it.</small></span>
        </a>
        <ProgressDots stage={state.stage} />
        <div className="trace-header-actions">
          <button type="button" onClick={() => openStory("identity")}>
            <span className="trace-button-icon" aria-hidden="true">◫</span>
            <span>Story</span>
          </button>
          <button type="button" onClick={toggleSound} aria-pressed={soundEnabled}>
            <span className="trace-button-icon" aria-hidden="true">{soundEnabled ? "◖))" : "◖×"}</span>
            <span>{soundEnabled ? "Sound" : "Muted"}</span>
          </button>
        </div>
      </header>

      <section className="trace-workspace" id="trace-workspace" aria-live="polite">
        <div className="trace-product-card">
          <Image
            src={story.image}
            alt={story.alt}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 56vw"
          />
          <div className="trace-image-wash" aria-hidden="true" />
          <div className="trace-image-topline">
            <span>{story.priority.replaceAll("-", " ")}</span>
            <span>{story.checkout.soldBy === "Weight" ? "wt" : "ea"}</span>
          </div>
          <div className="trace-image-story">
            <span className="trace-image-family">{story.family}</span>
            <h2>{story.title}</h2>
            <div className="trace-fact-row">
              {story.storyBeats.slice(0, revealedBeatCount).map((beat) => (
                <span key={beat.id}><small>{beat.label}</small>{beat.value}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="trace-panel">
          {state.stage === "meet" && (
            <section className="trace-phase trace-meet-phase">
              <p className="trace-eyebrow"><span /> Tell the product story</p>
              <h1>Read the product before the number.</h1>
              <p className="trace-lead">
                Begin with identity. The code is attached only after the exact checkout item is resolved.
              </p>
              <div className="trace-cue-row">
                {story.visualCues.map((cue) => <span key={cue}>{cue}</span>)}
              </div>
              <div className="trace-primary-actions">
                <button className="trace-primary" type="button" onClick={() => send({ type: "START" })}>
                  Resolve this item <i aria-hidden="true">→</i>
                </button>
                <button className="trace-secondary" type="button" onClick={() => openStory("checkout")}>
                  Why sale form matters
                </button>
              </div>
            </section>
          )}

          {state.stage === "resolve" && (
            <IdentityPrompt
              prompt={story.classificationPrompts[promptIndex]}
              promptIndex={promptIndex}
              total={story.classificationPrompts.length}
              wrongChoice={wrongChoice}
              locked={identityLocked}
              onChoice={handleIdentityChoice}
            />
          )}

          {state.stage === "attach" && (
            <section className="trace-phase trace-attach-phase">
              <p className="trace-eyebrow"><span /> Attach the official code</p>
              <h1>{story.identity.variant}</h1>
              <p className="trace-lead">{story.checkout.summary}</p>
              <div className="trace-code-lockup" aria-label={`PLU ${story.checkout.code}`}>
                {path.chunks.map((chunk, index) => (
                  <span key={`${chunk}-${index}`}><b>{chunk}</b><small>{index === 0 ? "first move" : "second move"}</small></span>
                ))}
              </div>
              <div className="trace-path-demo">
                <div className="trace-path-heading">
                  <div><span>Checkout path</span><strong>{path.chunks.join(" · ")}</strong></div>
                  <div className="trace-layout-toggle" aria-label="Keypad layout">
                    <button type="button" className={layout === "calculator" ? "active" : ""} onClick={() => setLayout("calculator")}>7–9 top</button>
                    <button type="button" className={layout === "phone" ? "active" : ""} onClick={() => setLayout("phone")}>1–3 top</button>
                  </div>
                </div>
                <KeypadPath path={path} entry={story.checkout.code} interactive={false} showPath compact />
              </div>
              <button className="trace-primary" type="button" onClick={beginTrace}>
                Trace it yourself <i aria-hidden="true">→</i>
              </button>
            </section>
          )}

          {state.stage === "trace" && (
            <section className="trace-phase trace-trace-phase">
              <p className="trace-eyebrow"><span /> Build procedural memory</p>
              <h1>Tap the checkout path.</h1>
              <p className="trace-lead">Two moves: <strong>{path.chunks.join(" · ")}</strong>. The pause keeps the chunks separate.</p>
              <CodeSlots codeLength={path.digits.length} entry={traceEntry} />
              <KeypadPath path={path} entry={traceEntry} interactive showPath={false} onDigit={handleTraceDigit} />
              <button className="trace-text-action" type="button" onClick={() => openStory("checkout")}>Review the checkout story</button>
            </section>
          )}

          {state.stage === "recall" && (
            <section className="trace-phase trace-recall-phase">
              <p className="trace-eyebrow"><span /> Recall without the path</p>
              <h1>What is the PLU?</h1>
              <p className="trace-lead">Use the product identity first. Recover the path only if direct recall stalls.</p>
              <CodeSlots codeLength={path.digits.length} entry={recallEntry} />
              <KeypadPath path={path} entry={recallEntry} interactive showPath={false} onDigit={handleRecallDigit} compact />
              <div className="trace-recall-actions">
                <button className="trace-secondary" type="button" onClick={() => openStory("checkout")}>I need the story</button>
                <button className="trace-primary" type="button" disabled={recallEntry.length !== path.digits.length} onClick={submitRecall}>Check</button>
              </div>
              {recallEntry.length > 0 && (
                <button className="trace-clear" type="button" onClick={deleteRecallDigit}>Delete last digit</button>
              )}
            </section>
          )}

          {state.stage === "repair" && (
            <section className="trace-phase trace-repair-phase">
              <p className="trace-eyebrow warning"><span /> Repair, don’t guess</p>
              <h1>The first break is in {repairChunk.chunk.length === 1 ? "the opening digit" : `chunk ${repairChunk.chunkIndex + 1}`}.</h1>
              <p className="trace-lead">Replay only the smallest failed unit, then retrieve the whole code again.</p>
              <div className="trace-repair-card">
                <div><span>Correct chunk</span><strong>{repairChunk.chunk}</strong></div>
                <KeypadPath path={path} entry={repairChunk.chunk} interactive={false} showPath activeChunk={repairChunk.chunkIndex} compact />
              </div>
              <button className="trace-primary" type="button" onClick={retryRecall}>Hide it and retrieve again <i aria-hidden="true">→</i></button>
            </section>
          )}

          {state.stage === "complete" && (
            <section className="trace-phase trace-complete-phase">
              <div className="trace-success-orbit" aria-hidden="true"><span>✓</span><i /><i /><i /><i /></div>
              <p className="trace-eyebrow success"><span /> Retrieved</p>
              <h1>Correct. One clean retrieval.</h1>
              <p className="trace-lead">That is evidence of learning—not mastery yet. The code should return after other products create interference.</p>
              <div className="trace-score-grid">
                <article><small>Competence</small><strong>{score}%</strong><span><OutcomeCopy outcome={outcome} /></span></article>
                <article><small>Identity</small><strong>{state.identityCorrect}/{story.classificationPrompts.length}</strong><span>{state.identityMisses ? `${state.identityMisses} repair${state.identityMisses > 1 ? "s" : ""}` : "First-pass resolution"}</span></article>
                <article><small>Code recall</small><strong>{state.recallMisses === 0 ? "1st" : `${state.recallAttempts}x`}</strong><span>{state.supportUses ? "Support used" : "Unassisted"}</span></article>
              </div>
              <button className="trace-confusion-card" type="button" onClick={() => openStory("neighbors")}>
                <span>Nearest visual confusion</span>
                <strong>{story.nearestConfusion.name} · {story.nearestConfusion.code}</strong>
                <small>{story.nearestConfusion.cue}</small>
              </button>
              <div className="trace-primary-actions horizontal">
                <button className="trace-primary" type="button" onClick={reset}>Run once more</button>
                <button className="trace-secondary" type="button" onClick={() => openStory("checkout")}>Open full story</button>
              </div>
            </section>
          )}
        </div>
      </section>

      <ReactionBubble reaction={reaction} />
      <StorySheet
        story={story}
        dialogRef={sheetRef}
        activeTab={storyTab}
        onTab={setStoryTab}
        onClose={closeStory}
      />
    </main>
  );
}
