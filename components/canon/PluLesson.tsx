"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChoiceVisual, Icon, friendlyQuestion } from "@/components/canon/Icon";
import { CodeSlots, NumberPad, chunkIndexForPosition, chunkStart } from "@/components/canon/Keypad";
import { ProductSheet } from "@/components/canon/ProductSheet";
import { ReviewedPhoto } from "@/components/canon/ReviewedPhoto";
import { compileCheckoutPath, firstDifferentDigit, toneForDigit } from "@/lib/trace/code-path";
import type { ProductPhotoRole, ProductStory } from "@/types/trace";

type Step = 1 | 2 | 3 | 4 | 5;
type SheetTab = "spot" | "checkout" | "similar";
type Reaction = { kind: "good" | "warn"; text: string } | null;

const progressLabels = ["Look", "Know", "Code", "Practice", "Recall"] as const;

function photoFor(story: ProductStory, role: ProductPhotoRole) {
  return story.photos.find((photo) => photo.role === role) ?? story.photos[0];
}

export function PluLesson({ story }: { story: ProductStory }) {
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
  const appRef = useRef<HTMLDivElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

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
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setReaction({ kind, text });
    reactionTimer.current = setTimeout(() => setReaction(null), 1050);
  }, []);

  useEffect(() => () => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
  }, []);

  useEffect(() => {
    const element = appRef.current;
    if (!element) return;
    element.inert = sheetOpen;
    if (sheetOpen) element.setAttribute("aria-hidden", "true");
    else element.removeAttribute("aria-hidden");
  }, [sheetOpen]);

  const openSheet = useCallback((tab: SheetTab = "spot") => {
    previousFocus.current = document.activeElement as HTMLElement;
    setSheetTab(tab);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    requestAnimationFrame(() => previousFocus.current?.focus({ preventScroll: true }));
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setQuestionIndex(0);
    setChoiceFeedback(null);
    setTraceEntry("");
    setRecallEntry("");
    setWrongChunk(null);
    setComplete(false);
    feedback("good", "Ready");
  }, [feedback]);

  const respondToPrompt = (choiceId: string) => {
    if (choiceId !== prompt.answer) {
      setChoiceFeedback({ id: choiceId, correct: false });
      window.setTimeout(() => setChoiceFeedback(null), 430);
      feedback("warn", "Look once more");
      tone(150, 0.1, 0.03);
      haptic([22, 22, 22]);
      return;
    }
    setChoiceFeedback({ id: choiceId, correct: true });
    feedback("good", questionIndex === story.classificationPrompts.length - 1 ? "That is the exact item" : "Yes");
    tone(520 + questionIndex * 70);
    haptic(11);
    window.setTimeout(() => {
      setChoiceFeedback(null);
      if (questionIndex < story.classificationPrompts.length - 1) setQuestionIndex((index) => index + 1);
      else setStep(3);
    }, 360);
  };

  const practiceDigit = (digit: string) => {
    const expected = code[traceEntry.length];
    const chunkIndex = chunkIndexForPosition(path.chunks, traceEntry.length);
    if (digit !== expected) {
      feedback("warn", "Start this group again");
      tone(145, 0.1, 0.03);
      haptic([20, 20, 20]);
      setTraceEntry(code.slice(0, chunkStart(path.chunks, chunkIndex)));
      return;
    }
    const next = `${traceEntry}${digit}`;
    setTraceEntry(next);
    tone(toneForDigit(digit));
    haptic(9);
    if (next.length === code.length) {
      feedback("good", "Ready");
      window.setTimeout(() => {
        setStep(5);
        setRecallEntry("");
      }, 420);
    }
  };

  const recallDigit = (digit: string) => {
    if (recallEntry.length >= code.length) return;
    setRecallEntry((entry) => `${entry}${digit}`);
    tone(toneForDigit(digit), 0.05, 0.02);
    haptic(8);
  };

  const checkRecall = () => {
    if (recallEntry !== code) {
      const wrongAt = firstDifferentDigit(code, recallEntry);
      setWrongChunk(chunkIndexForPosition(path.chunks, Math.max(0, wrongAt)));
      feedback("warn", "Repair one group");
      tone(145, 0.11, 0.03);
      haptic([25, 22, 25]);
      return;
    }
    setComplete(true);
    feedback("good", "You got it");
    [523, 659, 784].forEach((frequency, index) => window.setTimeout(() => tone(frequency, 0.12, 0.04), index * 70));
    haptic([18, 35, 30]);
    try {
      window.localStorage.setItem(`plu:complete:${story.id}`, JSON.stringify({ completedAt: new Date().toISOString() }));
    } catch {
      // Persistence is optional.
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (sheetOpen || complete) return;
      if (step === 4 && /^\d$/.test(event.key)) practiceDigit(event.key);
      if (step === 5 && wrongChunk === null) {
        if (/^\d$/.test(event.key)) recallDigit(event.key);
        if (event.key === "Backspace") setRecallEntry((entry) => entry.slice(0, -1));
        if (event.key === "Enter" && recallEntry.length === code.length) checkRecall();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const factCount = step === 1 ? 1 : step === 2 ? Math.min(3, questionIndex + 2) : 4;
  const facts = [
    { icon: "bell" as const, label: `${story.identity.form} shape` },
    { icon: "color" as const, label: story.identity.color },
    { icon: "loose" as const, label: story.checkout.saleForm },
    { icon: "scale" as const, label: story.checkout.soldBy === "Weight" ? "By weight" : "Each" },
  ];

  return (
    <>
      <div className="app" ref={appRef} data-step={step} data-complete={complete}>
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
            <button className="headerButton" type="button" aria-label="Open product story" onClick={() => openSheet("spot")}><Icon name="bookmark" /><span>Story</span></button>
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
              <div className="factChips" aria-live="polite">
                {facts.slice(0, factCount).map((fact) => <span className="factChip" key={fact.label}><Icon name={fact.icon} />{fact.label}</span>)}
              </div>
            </figcaption>
          </figure>

          <section className="lessonCard" aria-live="polite">
            <div className="lessonScroller">
              {step === 1 && (
                <section className="lessonView" data-screen="look">
                  <p className="kicker">Look</p>
                  <h2>Notice what makes it distinct.</h2>
                  <div className="visualCueGrid">
                    <article className="visualCue"><span className="visualCueIcon"><Icon name="bell" /></span><span><b>{story.identity.form} shape</b><small>{story.visualCues[0]}</small></span></article>
                    <article className="visualCue"><span className="visualCueIcon"><Icon name="color" /></span><span><b>{story.identity.color}</b><small>{story.visualCues[1]}</small></span></article>
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
                      <button className={`choiceButton${choiceFeedback?.id === choice.id ? (choiceFeedback.correct ? " correct" : " wrong") : ""}`} data-choice={choice.id} type="button" onClick={() => respondToPrompt(choice.id)} key={choice.id}>
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
                  <h2>This {story.title.toLowerCase()} is:</h2>
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
                    <NumberPad code={code} entry={traceEntry} guided onDigit={practiceDigit} />
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

            <div className={`actionDock${step === 2 || step === 4 ? " hiddenDock" : ""}${step === 5 && !complete && wrongChunk === null ? " two" : complete ? " two" : ""}`}>
              {step === 1 && <button className="primaryAction" type="button" onClick={() => setStep(2)}>Start</button>}
              {step === 2 && null}
              {step === 3 && <button className="primaryAction" type="button" onClick={() => { setTraceEntry(""); setStep(4); }}>Practice {code}</button>}
              {step === 4 && null}
              {step === 5 && !complete && wrongChunk !== null && <button className="primaryAction" type="button" onClick={() => { setWrongChunk(null); setRecallEntry(""); }}>Try again</button>}
              {step === 5 && !complete && wrongChunk === null && <><button className="secondaryAction" type="button" disabled={!recallEntry} onClick={() => setRecallEntry((entry) => entry.slice(0, -1))}>Delete</button><button className="primaryAction" type="button" disabled={recallEntry.length !== code.length} onClick={checkRecall}>Check</button></>}
              {complete && <><button className="secondaryAction" type="button" onClick={() => openSheet("similar")}>Similar items</button><button className="primaryAction" type="button" onClick={reset}>Run again</button></>}
            </div>
          </section>
        </main>

        <div className={`reaction${reaction ? ` show ${reaction.kind === "warn" ? "warn" : ""}` : ""}`} role="status" aria-live="polite">{reaction?.text ?? ""}</div>
      </div>

      <ProductSheet story={story} tab={sheetTab} open={sheetOpen} onTab={setSheetTab} onClose={closeSheet} />
    </>
  );
}
