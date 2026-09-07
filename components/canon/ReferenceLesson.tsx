"use client";

import Image from "next/image";
import { ArrowRight, BookOpen, Check, CircleHelp, Copy, Eye, FileQuestion, ImageOff, RotateCcw, ShieldCheck, Store } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { ReferenceSheet } from "@/components/canon/ReferenceSheet";
import { LessonFinishActions } from "@/components/canon/LessonFinishActions";
import type { LessonDestination } from "@/types/lesson";
import { chunkCode } from "@/lib/trace/code-path";
import { canRecallReferenceCode, isSavedReferenceStudy, REFERENCE_STUDY_EVENT, referenceCodeHints, referenceCodeLabels, referenceSignature, referenceSourceChoices, referenceStorageKey, referenceVisualCue, validateReferenceCodeRecall } from "@/lib/trace/reference-study";
import type { ReferenceLessonData } from "@/types/reference";

type Step = 1 | 2 | 3 | 4;
type Persistence = "checking" | "available" | "saved" | "unavailable";
const steps = ["Look", "Recall", "Check", "Studied"];
const statusIcons = { recorded: BookOpen, missing: FileQuestion, conflicted: Copy, uncertain: CircleHelp };

function RecordedCode({ code }: { code: string }) {
  return <div className="codeHero referenceCodeHero" aria-label={`Recorded code ${code}`}>
    {chunkCode(code).map((chunk, index) => <span className="codePair" key={index}><b>{chunk}</b></span>)}
  </div>;
}

function notifyProgress(catalogId: string) {
  window.dispatchEvent(new CustomEvent(REFERENCE_STUDY_EVENT, { detail: { catalogId } }));
}

export function ReferenceLesson({ lesson, nextLesson = null }: { lesson: ReferenceLessonData; nextLesson?: LessonDestination | null }) {
  const [step, setStep] = useState<Step>(1);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [sourceChoice, setSourceChoice] = useState<string | null>(null);
  const [guardChoice, setGuardChoice] = useState<string | null>(null);
  const [persistence, setPersistence] = useState<Persistence>("checking");
  const [restored, setRestored] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetTrigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const storageKey = referenceStorageKey(lesson.catalogId);
  const signature = referenceSignature(lesson);
  const codeRecall = canRecallReferenceCode(lesson);
  const illustrated = lesson.media.kind === "generated-illustration";
  const imageUnavailable = failedImage === lesson.media.src;
  const StatusIcon = statusIcons[lesson.codeStatus];
  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    sheetTrigger.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    setStep(1);
    setEntry("");
    setError("");
    setRevealed(false);
    setSourceChoice(null);
    setGuardChoice(null);
    setRestored(false);
    try {
      if (isSavedReferenceStudy(window.localStorage.getItem(storageKey), signature)) {
        setStep(4);
        setPersistence("saved");
        setRestored(true);
      } else setPersistence("available");
    } catch {
      setPersistence("unavailable");
    }
  }, [storageKey, signature]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    scroller.current?.scrollTo({ top: 0 });
    if (step === 2 && codeRecall && !revealed) input.current?.focus({ preventScroll: true });
    else heading.current?.focus({ preventScroll: true });
  }, [step, codeRecall, revealed]);

  const reset = () => {
    try {
      window.localStorage.removeItem(storageKey);
      setPersistence("available");
      notifyProgress(lesson.catalogId);
    } catch {
      setPersistence("unavailable");
    }
    setStep(1);
    setEntry("");
    setError("");
    setRevealed(false);
    setSourceChoice(null);
    setGuardChoice(null);
    setRestored(false);
    scroller.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  };

  const submitRecall = (event: FormEvent) => {
    event.preventDefault();
    if (step !== 2 || revealed || !codeRecall) return;
    const result = validateReferenceCodeRecall(entry, lesson);
    if (result.correct) {
      setError("");
      setEntry("");
      setStep(3);
      return;
    }
    const messages = {
      unverified: "Code unconfirmed. Check the notes.",
      empty: "Enter the code.",
      malformed: "Digits only. Keep leading zeros.",
      wrong: "Not quite. Try again or take a peek.",
    };
    setError(messages[result.reason]);
    input.current?.focus();
  };

  const chooseSource = (choice: string) => {
    if (step !== 2 || codeRecall || revealed) return;
    setSourceChoice(choice);
    if (choice === "source") {
      setError("");
      setStep(3);
    } else {
      setError("Not quite. Take another look.");
    }
  };

  const chooseGuard = (choice: string) => {
    if (step !== 3) return;
    setGuardChoice(choice);
    if (choice !== "verify") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, signature, completedAt: new Date().toISOString() }));
      setPersistence("saved");
      notifyProgress(lesson.catalogId);
    } catch {
      setPersistence("unavailable");
    }
    setStep(4);
  };

  const returnToInspection = () => {
    setStep(1);
    setError("");
    setRevealed(false);
    setEntry("");
    setSourceChoice(null);
    setGuardChoice(null);
  };

  return (
    <><div className="app relationshipApp referenceApp" data-reference-step={step} data-reference-mode={codeRecall ? "recorded-code" : "source-note"}>
      <header className="topbar">
        <span aria-hidden="true" />
        <div className="progress" aria-label={`Step ${step} of 4: ${steps[step - 1]}`}>
          <span className="progressLabel">Step <b>{step} of 4</b></span>
          <div className="progressDots" aria-hidden="true">{steps.map((label, index) => <i className={`${index + 1 <= step ? "active" : ""}${index + 1 === step ? " current" : ""}`} key={label} />)}</div>
        </div>
        <div className="topActions">
          <button ref={sheetTrigger} type="button" className="headerButton" onClick={() => setSheetOpen(true)} aria-label="Open item details" aria-haspopup="dialog"><BookOpen aria-hidden="true" /><span>Details</span></button>
          <button type="button" className="headerButton" onClick={reset} aria-label="Restart reference study and clear its saved result"><RotateCcw aria-hidden="true" /><span>Restart</span></button>
        </div>
      </header>

      <main className="workspace">
        <figure className="productStage referenceStage">
          <div className="photoStack">
            {imageUnavailable ? <div className="referenceImageFailure" role="status"><ImageOff aria-hidden="true" /><span>Image unavailable</span><button type="button" onClick={() => setFailedImage(null)}>Retry image</button></div> : <Image className="referencePhoto" src={lesson.media.src} alt={step === 2 ? `${illustrated ? "AI illustration" : "Reference photo"} of ${lesson.title}; reference only.` : lesson.media.alt} fill sizes="(max-width: 980px) 100vw, 55vw" priority unoptimized onError={() => setFailedImage(lesson.media.src)} />}
            <div className="photoWash" aria-hidden="true" />
          </div>
          <div className="mediaBadgeRow"><span className="badge">{illustrated ? "AI illustration" : "Reference photo"}</span><span className="badge referenceOnlyBadge">Reference only</span></div>
          <figcaption className="photoCaption">
            <span className="familyLabel">{lesson.family}</span>
            <h1>{lesson.title}</h1>
          </figcaption>
        </figure>

        <section className="lessonCard relationshipCard referenceCard" aria-labelledby="reference-heading">
          <div className="lessonScroller" ref={scroller}>
            <div className={`lessonView${step === 4 ? " successView" : ""}`}>
              <p className="kicker">{step === 4 ? "Reference" : steps[step - 1]}</p>
              <h2 id="reference-heading" ref={heading} tabIndex={-1}>{step === 1 ? "Take a closer look." : step === 2 ? codeRecall ? "Enter the recorded code." : "What needs checking?" : step === 3 ? "Before you ring it up?" : "Studied."}</h2>

              {step === 1 && <>
                <div className="referenceCue"><Eye aria-hidden="true" /><p>{referenceVisualCue(lesson)}</p></div>
                {codeRecall ? <>
                  <p className="referenceCodeLabel">Recorded code</p>
                  <RecordedCode code={lesson.codes[0]} />
                </> : <div className="referenceStatus"><StatusIcon aria-hidden="true" /><div><b>{referenceCodeLabels[lesson.codeStatus]}</b><small>{referenceCodeHints[lesson.codeStatus]}</small></div></div>}
              </>}

              {step === 2 && <>
                {revealed ? <div className="relationshipRepair" role="status">
                  {codeRecall ? <RecordedCode code={lesson.codes[0]} /> : <div className="referenceStatus"><StatusIcon aria-hidden="true" /><div><b>{referenceCodeLabels[lesson.codeStatus]}</b><small>{referenceCodeHints[lesson.codeStatus]}</small></div></div>}
                  <p>Look once. Then try again.</p>
                </div> : codeRecall ? <form id="reference-recall" onSubmit={submitRecall} className="relationshipRecall" noValidate>
                  <label htmlFor="reference-code" className="relationshipSrOnly">Recorded code</label>
                  <input ref={input} id="reference-code" type="text" inputMode="numeric" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} value={entry} onChange={(event) => { setEntry(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={`reference-entry-help${error ? " reference-entry-error" : ""}`} />
                  <p id="reference-entry-help" className="relationshipSrOnly">Keep any leading zeros.</p>
                  {error && <p className="relationshipError" id="reference-entry-error" role="alert">{error}</p>}
                </form> : <>
                  <div className="choiceGrid referenceChoices" role="group" aria-label="Source check choices">{referenceSourceChoices(lesson).map((choice) => {
                    const ChoiceIcon = statusIcons[choice.status];
                    return <button key={choice.id} type="button" className={`choiceButton${sourceChoice === choice.id && choice.id !== "source" ? " wrong" : ""}`} onClick={() => chooseSource(choice.id)}><span className="choiceVisual"><ChoiceIcon aria-hidden="true" /></span><span className="choiceCopy"><b>{choice.text}</b></span><ArrowRight className="choiceArrow" aria-hidden="true" /></button>;
                  })}</div>
                  {error && <p className="relationshipError" role="alert">{error}</p>}
                </>}
              </>}

              {step === 3 && <>
                <div className="choiceGrid referenceChoices" role="group" aria-label="Checkout choices">
                  <button type="button" className={`choiceButton${guardChoice === "photo" ? " wrong" : ""}`} onClick={() => chooseGuard("photo")}><span className="choiceVisual"><Eye aria-hidden="true" /></span><span className="choiceCopy"><b>Go by the picture</b></span><ArrowRight className="choiceArrow" aria-hidden="true" /></button>
                  <button type="button" className="choiceButton" onClick={() => chooseGuard("verify")}><span className="choiceVisual"><Store aria-hidden="true" /></span><span className="choiceCopy"><b>Check the store listing</b></span><ArrowRight className="choiceArrow" aria-hidden="true" /></button>
                  <button type="button" className={`choiceButton${guardChoice === "guess" ? " wrong" : ""}`} onClick={() => chooseGuard("guess")}><span className="choiceVisual"><Copy aria-hidden="true" /></span><span className="choiceCopy"><b>Borrow a similar item's code</b></span><ArrowRight className="choiceArrow" aria-hidden="true" /></button>
                </div>
                {guardChoice && guardChoice !== "verify" && <p className="relationshipError" role="alert">{guardChoice === "photo" ? "A picture can't confirm the code." : "Similar items can have different codes."} Try again.</p>}
              </>}

              {step === 4 && <>
                <div className="relationshipSuccess referenceSuccess" aria-hidden="true"><Check /></div>
                <p className="referenceFinishNote"><ShieldCheck aria-hidden="true" />Still check the item, code and unit in store.</p>
                {persistence === "saved" && <p className="relationshipQuiet" role="status">{restored ? "Studied on this device." : "Saved on this device."}</p>}
              </>}

              {persistence === "unavailable" && <p className="relationshipPersistence" role="status">Progress can't be saved on this device.</p>}
            </div>
          </div>

          <div className={`actionDock${(step === 2 && !revealed && codeRecall) || step === 4 ? " two" : ""}`}>
            {step === 1 && <button type="button" className="primaryAction" onClick={() => setStep(2)}>Start <ArrowRight aria-hidden="true" /></button>}
            {step === 2 && !revealed && codeRecall && <><button type="button" className="secondaryAction" onClick={() => { setError(""); setRevealed(true); }}>Peek</button><button type="submit" form="reference-recall" className="primaryAction">Check</button></>}
            {step === 2 && !revealed && !codeRecall && <button type="button" className="secondaryAction" onClick={() => { setError(""); setRevealed(true); }}>Look again</button>}
            {step === 2 && revealed && <button type="button" className="primaryAction" onClick={() => { setEntry(""); setError(""); setSourceChoice(null); setRevealed(false); }}>Try again</button>}
            {step === 3 && <button type="button" className="secondaryAction" onClick={returnToInspection}>Look again</button>}
            {step === 4 && <LessonFinishActions next={nextLesson} onRetry={reset} />}
          </div>
        </section>
      </main>
    </div><ReferenceSheet lesson={lesson} open={sheetOpen} onClose={closeSheet} /></>
  );
}
