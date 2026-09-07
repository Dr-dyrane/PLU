"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChoiceVisual, Icon, friendlyQuestion } from "@/components/canon/Icon";
import { CodeSlots, NumberPad, chunkIndexForPosition, chunkStart } from "@/components/canon/Keypad";
import { LessonFinishActions } from "@/components/canon/LessonFinishActions";
import { ProductSheet } from "@/components/canon/ProductSheet";
import { ReviewedPhoto } from "@/components/canon/ReviewedPhoto";
import { compileCheckoutPath, firstDifferentDigit, toneForDigit } from "@/lib/trace/code-path";
import { createLessonTransition } from "@/lib/trace/lesson-transition";
import type { LessonDestination } from "@/types/lesson";
import type { ProductPhotoRole, ProductStory } from "@/types/trace";

type Step = 1 | 2 | 3 | 4 | 5;
type SheetTab = "spot" | "checkout" | "similar";
type Reaction = { kind: "good" | "warn"; text: string } | null;

const progressLabels = ["Look", "Know", "Code", "Practice", "Recall"] as const;

function photoFor(story: ProductStory, role: ProductPhotoRole) {
  return story.photos.find((photo) => photo.role === role) ?? story.photos[0];
}

export function PluLesson({ story, nextLesson }: { story: ProductStory; nextLesson?: LessonDestination | null }) {
  const [step, setStep] = useState<Step>(1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [choiceFeedback, setChoiceFeedback] = useState<{ id: string; correct: boolean } | null>(null);
  const [traceEntry, setTraceEntry] = useState("");
  const [recallEntry, setRecallEntry] = useState("");
  const [wrongChunk, setWrongChunk] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const [sound, setSound] = useState(false);
  const [reaction, setReaction] = useState<Reaction>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<SheetTab>("spot");
  const [pending, setPending] = useState(false);
  const [transition] = useState(() => createLessonTransition());
  const appRef = useRef<HTMLDivElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const reactionCancel = useRef<(() => void) | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const active = useRef(true);
  const stepRef = useRef<Step>(1);
  const questionIndexRef = useRef(0);
  const traceEntryRef = useRef("");
  const recallEntryRef = useRef("");
  const wrongChunkRef = useRef<number | null>(null);
  const completeRef = useRef(false);
  const sheetOpenRef = useRef(false);

  const path = useMemo(() => compileCheckoutPath(story.checkout.code, "calculator"), [story.checkout.code]);
  const code = path.code;
  const prompt = story.classificationPrompts[questionIndex];
  const activeRole: ProductPhotoRole = step === 1 || step === 3 ? "hero" : step === 5 ? "context" : "alternate";

  const tone = useCallback((frequency: number, duration = 0.065, volume = 0.035) => {
    if (!sound || typeof window === "undefined") return;
    const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioCtor = window.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioCtor) return;
    const context = audioContext.current ?? new AudioCtor();
    audioContext.current = context;
    if (context.state === "suspended") void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, [sound]);

  const haptic = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  }, []);

  const feedback = useCallback((kind: "good" | "warn", text: string) => {
    reactionCancel.current?.();
    setReaction({ kind, text });
    reactionCancel.current = transition.schedule(() => setReaction(null), 1050);
  }, [transition]);

  useEffect(() => {
    const element = appRef.current;
    if (!element) return;
    element.inert = sheetOpen;
    if (sheetOpen) element.setAttribute("aria-hidden", "true");
    else element.removeAttribute("aria-hidden");
  }, [sheetOpen]);

  const openSheet = useCallback((tab: SheetTab = "spot") => {
    if (!active.current || transition.isPending()) return;
    previousFocus.current = document.activeElement as HTMLElement;
    sheetOpenRef.current = true;
    setSheetTab(tab);
    setSheetOpen(true);
  }, [transition]);

  const closeSheet = useCallback(() => {
    sheetOpenRef.current = false;
    setSheetOpen(false);
    transition.schedule(() => previousFocus.current?.focus({ preventScroll: true }), 0);
  }, [transition]);

  const resetSession = useCallback((announce = true) => {
    transition.cancelAll();
    reactionCancel.current = null;
    stepRef.current = 1;
    questionIndexRef.current = 0;
    traceEntryRef.current = "";
    recallEntryRef.current = "";
    wrongChunkRef.current = null;
    completeRef.current = false;
    sheetOpenRef.current = false;
    setPending(false);
    setSheetOpen(false);
    setReaction(null);
    setStep(1);
    setQuestionIndex(0);
    setChoiceFeedback(null);
    setTraceEntry("");
    setRecallEntry("");
    setWrongChunk(null);
    setComplete(false);
    if (announce) feedback("good", "Ready");
  }, [feedback, transition]);

  const reset = useCallback(() => resetSession(), [resetSession]);

  useEffect(() => {
    active.current = true;
    resetSession(false);
    return () => {
      active.current = false;
      transition.cancelAll();
      void audioContext.current?.close().catch(() => {});
      audioContext.current = null;
    };
  }, [story.id, resetSession, transition]);

  const goToStep = (next: Step) => {
    stepRef.current = next;
    setStep(next);
  };

  const beginTransition = (delay: number, callback: () => void) => {
    if (!transition.begin(delay, () => { callback(); setPending(false); })) return false;
    setPending(true);
    return true;
  };

  const respondToPrompt = (choiceId: string) => {
    if (!active.current || stepRef.current !== 2 || sheetOpenRef.current || transition.isPending()) return;
    const index = questionIndexRef.current;
    const currentPrompt = story.classificationPrompts[index];
    if (!currentPrompt) return;
    const correct = choiceId === currentPrompt.answer;
    if (!beginTransition(correct ? 360 : 430, () => {
      setChoiceFeedback(null);
      if (!correct) return;
      if (index < story.classificationPrompts.length - 1) {
        questionIndexRef.current = index + 1;
        setQuestionIndex(index + 1);
      } else goToStep(3);
    })) return;
    if (!correct) {
      setChoiceFeedback({ id: choiceId, correct: false });
      feedback("warn", "Look once more");
      tone(150, 0.1, 0.03);
      haptic([22, 22, 22]);
      return;
    }
    setChoiceFeedback({ id: choiceId, correct: true });
    feedback("good", index === story.classificationPrompts.length - 1 ? "That is the exact item" : "Yes");
    tone(520 + index * 70);
    haptic(11);
  };

  const practiceDigit = (digit: string) => {
    if (!active.current || stepRef.current !== 4 || sheetOpenRef.current || transition.isPending() || traceEntryRef.current.length >= code.length) return;
    const expected = code[traceEntryRef.current.length];
    const chunkIndex = chunkIndexForPosition(path.chunks, traceEntryRef.current.length);
    if (digit !== expected) {
      feedback("warn", "Start this group again");
      tone(145, 0.1, 0.03);
      haptic([20, 20, 20]);
      traceEntryRef.current = code.slice(0, chunkStart(path.chunks, chunkIndex));
      setTraceEntry(traceEntryRef.current);
      return;
    }
    const next = `${traceEntryRef.current}${digit}`;
    traceEntryRef.current = next;
    setTraceEntry(next);
    tone(toneForDigit(digit));
    haptic(9);
    if (next.length === code.length) {
      feedback("good", "Ready");
      beginTransition(420, () => {
        goToStep(5);
        recallEntryRef.current = "";
        setRecallEntry("");
      });
    }
  };

  const recallDigit = (digit: string) => {
    if (!active.current || stepRef.current !== 5 || sheetOpenRef.current || completeRef.current || wrongChunkRef.current !== null || transition.isPending() || recallEntryRef.current.length >= code.length) return;
    recallEntryRef.current += digit;
    setRecallEntry(recallEntryRef.current);
    tone(toneForDigit(digit), 0.05, 0.02);
    haptic(8);
  };

  const checkRecall = () => {
    if (!active.current || stepRef.current !== 5 || sheetOpenRef.current || completeRef.current || wrongChunkRef.current !== null || transition.isPending()) return;
    if (recallEntryRef.current !== code) {
      const wrongAt = firstDifferentDigit(code, recallEntryRef.current);
      wrongChunkRef.current = chunkIndexForPosition(path.chunks, Math.max(0, wrongAt));
      setWrongChunk(wrongChunkRef.current);
      feedback("warn", "Repair one group");
      tone(145, 0.11, 0.03);
      haptic([25, 22, 25]);
      return;
    }
    completeRef.current = true;
    setComplete(true);
    feedback("good", "You got it");
    [523, 659, 784].forEach((frequency, index) => transition.schedule(() => tone(frequency, 0.12, 0.04), index * 70));
    haptic([18, 35, 30]);
    try {
      window.localStorage.setItem(`plu:complete:${story.id}`, JSON.stringify({ completedAt: new Date().toISOString() }));
    } catch {
      // Persistence is optional.
    }
  };

  const deleteRecallDigit = () => {
    if (!active.current || stepRef.current !== 5 || sheetOpenRef.current || completeRef.current || wrongChunkRef.current !== null || transition.isPending()) return;
    recallEntryRef.current = recallEntryRef.current.slice(0, -1);
    setRecallEntry(recallEntryRef.current);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!active.current || sheetOpenRef.current || completeRef.current || transition.isPending() || wrongChunkRef.current !== null || event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest("input, textarea, select"))) return;
      if (event.key === "Enter" && event.target instanceof HTMLElement && event.target.closest(".topbar, .actionDock, .lessonRouteNav")) return;
      if (stepRef.current === 4 && /^\d$/.test(event.key)) { event.preventDefault(); practiceDigit(event.key); }
      if (stepRef.current === 5) {
        if (/^\d$/.test(event.key) || event.key === "Backspace" || event.key === "Enter") event.preventDefault();
        if (/^\d$/.test(event.key)) recallDigit(event.key);
        if (event.key === "Backspace") deleteRecallDigit();
        if (event.key === "Enter" && recallEntryRef.current.length === code.length) checkRecall();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const factCount = step === 1 ? 1 : step === 2 ? Math.min(3, questionIndex + 2) : 4;
  const facts = [
    { icon: "bell" as const, label: story.identity.form },
    { icon: "color" as const, label: story.identity.color },
    { icon: "loose" as const, label: story.checkout.saleForm },
    { icon: "scale" as const, label: story.checkout.soldBy === "Weight" ? "By weight" : "Each" },
  ];

  return (
    <>
      <div className="app" ref={appRef} data-step={step} data-complete={complete} data-pending={pending}>
        <header className="topbar">
          <button className="brand" type="button" aria-label={`Restart ${story.title} lesson`} onClick={reset}>
            <img src="/icon.svg" alt="" aria-hidden="true" />
            <span><strong>PLU</strong><small>See it. Know it. Ring it.</small></span>
          </button>
          <div className="progress" aria-label={`Step ${step} of 5: ${progressLabels[step - 1]}`}>
            <span className="progressLabel">Step <b>{step} of 5</b></span>
            <div className="progressDots" aria-hidden="true">
              {progressLabels.map((_, index) => <i className={`${index + 1 <= step ? "active" : ""}${index + 1 === step ? " current" : ""}`} key={index} />)}
            </div>
          </div>
          <div className="topActions">
            <button className="headerButton" type="button" aria-label="Open product story" disabled={pending} onClick={() => openSheet("spot")}><Icon name="bookmark" /><span>Story</span></button>
            <button
              className="headerButton"
              type="button"
              aria-label={sound ? "Turn sound off" : "Turn sound on"}
              aria-pressed={sound}
              onClick={() => {
                setSound((value) => !value);
                feedback("good", sound ? "Sound off" : "Sound on");
              }}
            ><Icon name={sound ? "sound" : "muted"} /><span>{sound ? "Sound on" : "Sound off"}</span></button>
          </div>
        </header>

        <main className="workspace">
          <figure className="productStage" aria-label={`${story.title} photographs`}>
            <div className="photoStack">
              {(["hero", "alternate", "context"] as ProductPhotoRole[]).map((role) => {
                const photo = photoFor(story, role);
                return <ReviewedPhoto photo={photo} className={`productPhoto${activeRole === role ? " active" : ""}`} data-role={role} style={{ objectPosition: photo.focus ?? "50% 50%" }} key={role} />;
              })}
              <div className="photoWash" aria-hidden="true" />
            </div>
            <div className="mediaBadgeRow" aria-hidden="true">
              <span className="badge">{story.priority.replaceAll("-", " ")}</span>
              <span className="badge badgeWeight"><Icon name="scale" />{story.checkout.soldBy}</span>
            </div>
            <figcaption className="photoCaption">
              <span className="familyLabel">{story.family}</span>
              <h1>{story.title}</h1>
              {step !== 1 && <div className="factChips" aria-live="polite">
                {facts.slice(0, factCount).map((fact) => <span className="factChip" key={fact.label}><Icon name={fact.icon} />{fact.label}</span>)}
              </div>}
            </figcaption>
          </figure>

          <section className="lessonCard" aria-live="polite" aria-busy={pending}>
            <div className="lessonScroller">
              {step === 1 && (
                <section className="lessonView" data-screen="look">
                  <p className="kicker">Look</p>
                  <h2>Notice what makes it distinct.</h2>
                  <div className={`visualCueGrid${story.identity.form.length > 32 ? " longForm" : ""}`}>
                    <article className="visualCue"><span className="visualCueIcon"><Icon name="bell" /></span><b>{story.identity.form}</b></article>
                    <article className="visualCue"><span className="visualCueIcon"><Icon name="color" /></span><b>{story.identity.color}</b></article>
                    <article className="visualCue"><span className="visualCueIcon"><Icon name="scale" /></span><span><b>{story.checkout.soldBy}</b><small>{story.checkout.saleForm}</small></span></article>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="lessonView" data-screen="find">
                  <div className="questionMeta"><p className="kicker" style={{ margin: 0 }}>Know</p><div className="miniDots" aria-label={`Question ${questionIndex + 1} of ${story.classificationPrompts.length}`}>{story.classificationPrompts.map((_, index) => <i className={index <= questionIndex ? "active" : ""} key={index} />)}</div></div>
                  <h2>{friendlyQuestion(prompt)}</h2>
                  <div className="choiceGrid">
                    {prompt.choices.map((choice) => (
                      <button className={`choiceButton${choiceFeedback?.id === choice.id ? (choiceFeedback.correct ? " correct" : " wrong") : ""}`} data-choice={choice.id} type="button" disabled={pending} onClick={() => respondToPrompt(choice.id)} key={choice.id}>
                        {ChoiceVisual(prompt, choice)}
                        <span className="choiceCopy"><b>{choice.label}</b></span>
                        <span className="choiceArrow" aria-hidden="true">→</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {step === 3 && (
                <section className="lessonView" data-screen="code">
                  <p className="kicker">Code</p>
                  <h2>Remember the code.</h2>
                  <div className="codeHero" aria-label={`PLU ${code}`}>
                    {path.chunks.map((chunk, index) => (
                      <Fragment key={`${chunk}-${index}`}>
                        {index > 0 && <i className="codeDivider" aria-hidden="true" />}
                        <span className="codePair"><b>{chunk}</b></span>
                      </Fragment>
                    ))}
                  </div>
                  <div className="codeMeaning"><Icon name="scale" /><span>{story.checkout.saleForm} · {story.checkout.soldBy.toLowerCase()}</span></div>
                  <div className="pathPreview" aria-label={`Enter ${code.split("").join(", ")}`}>
                    {path.chunks.map((chunk, index) => (
                      <Fragment key={`${chunk}-preview`}>
                        {index > 0 && <span className="pathPause">pause</span>}
                        <div className="pathGroup">{chunk.split("").map((digit, digitIndex) => <Fragment key={`${digit}-${digitIndex}`}>{digitIndex > 0 && <span className="pathArrow">→</span>}<span className="pathKey">{digit}</span></Fragment>)}</div>
                      </Fragment>
                    ))}
                  </div>
                </section>
              )}

              {step === 4 && (() => {
                const activeChunk = chunkIndexForPosition(path.chunks, traceEntry.length);
                return (
                  <section className="lessonView" data-screen="practice">
                    <p className="kicker">Practice</p>
                    <h2>Follow the glow.</h2>
                    <CodeSlots codeLength={code.length} entry={traceEntry} />
                    <div className="pairProgress"><span>Now</span><b>{path.chunks[activeChunk]}</b></div>
                    <fieldset disabled={pending} aria-label="Practice number pad" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><NumberPad code={code} entry={traceEntry} guided onDigit={practiceDigit} /></fieldset>
                  </section>
                );
              })()}

              {step === 5 && !complete && (
                <section className="lessonView" data-screen="recall">
                  <p className="kicker">Recall</p>
                  <h2>Enter the PLU.</h2>
                  <CodeSlots codeLength={code.length} entry={recallEntry} error={wrongChunk !== null} />
                  {wrongChunk !== null ? (
                    <div className="repairCue"><b>{path.chunks[wrongChunk]}</b><span>Look once. Then enter the whole code again.</span></div>
                  ) : (
                    <NumberPad code={code} entry={recallEntry} guided={false} onDigit={recallDigit} />
                  )}
                </section>
              )}

              {complete && (
                <section className="lessonView successView" data-screen="complete">
                  <div className="successMark" aria-hidden="true">✓</div>
                  <p className="kicker" style={{ justifyContent: "center" }}>Recalled</p>
                  <h2>You got it.</h2>
                  <div className="successCode">{code}</div>
                  <div className="successTrail"><span><i />Found it</span><span><i />Practiced it</span><span><i />Entered it</span></div>
                </section>
              )}
            </div>

            {complete ? <div className="actionDock two"><LessonFinishActions next={nextLesson ?? null} onRetry={reset} retryLabel="Run again" /></div> : <div className={`actionDock${step === 2 || step === 4 ? " hiddenDock" : ""}${step === 5 && wrongChunk === null ? " two" : ""}`}>
              {step === 1 && <button className="primaryAction" type="button" onClick={() => { if (stepRef.current === 1 && !sheetOpenRef.current) goToStep(2); }}>Start</button>}
              {step === 2 && null}
              {step === 3 && <button className="primaryAction" type="button" onClick={() => { if (stepRef.current !== 3 || sheetOpenRef.current) return; traceEntryRef.current = ""; setTraceEntry(""); goToStep(4); }}>Practice {code}</button>}
              {step === 4 && null}
              {step === 5 && wrongChunk !== null && <button className="primaryAction" type="button" onClick={() => { wrongChunkRef.current = null; recallEntryRef.current = ""; setWrongChunk(null); setRecallEntry(""); }}>Try again</button>}
              {step === 5 && wrongChunk === null && <><button className="secondaryAction" type="button" disabled={!recallEntry} onClick={deleteRecallDigit}>Delete</button><button className="primaryAction" type="button" disabled={recallEntry.length !== code.length} onClick={checkRecall}>Check</button></>}
            </div>}
          </section>
        </main>

        <div className={`reaction${reaction ? ` show ${reaction.kind === "warn" ? "warn" : ""}` : ""}`} role="status" aria-live="polite">{reaction?.text ?? ""}</div>
      </div>

      <ProductSheet story={story} tab={sheetTab} open={sheetOpen} onTab={setSheetTab} onClose={closeSheet} />
    </>
  );
}
