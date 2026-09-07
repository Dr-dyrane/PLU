"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Copy, Eye, ImageOff, RotateCcw, ShieldCheck, Store } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { RelationshipSheet } from "@/components/canon/RelationshipSheet";
import { chunkCode } from "@/lib/trace/code-path";
import { isSavedRelationshipStudy, relationshipSignature, validateRelationshipRecall } from "@/lib/trace/relationship-recall";
import type { RelationshipLessonData } from "@/types/relationship";

type Step = 1 | 2 | 3 | 4;
type Persistence = "checking" | "available" | "saved" | "unavailable";
const steps = ["Look", "Recall", "Check", "Studied"];

function CodeSet({ codes }: { codes: string[] }) {
  return <div className="relationshipCodeSet" role="group" aria-label="Complete recorded code set">
    {codes.map((code) => <code className="relationshipCodeChip" key={code} aria-label={code}>{chunkCode(code).map((chunk, index) => <span key={index}>{chunk}</span>)}</code>)}
  </div>;
}

export function RelationshipLesson({ lesson }: { lesson: RelationshipLessonData }) {
  const [step, setStep] = useState<Step>(1);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [guardChoice, setGuardChoice] = useState<string | null>(null);
  const [persistence, setPersistence] = useState<Persistence>("checking");
  const [restored, setRestored] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const sheetTrigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const initialFocus = useRef(true);
  const storageKey = `plu:relationship:${lesson.catalogId}`;
  const signature = relationshipSignature(lesson);
  const multiple = lesson.codes.length > 1;
  const pages = lesson.sourcePages.length ? `${lesson.sourcePages.length === 1 ? "Page" : "Pages"} ${lesson.sourcePages.join(", ")}` : "Page not recorded";
  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    sheetTrigger.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    setStep(1);
    setEntry("");
    setError("");
    setRevealed(false);
    setGuardChoice(null);
    setRestored(false);
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (isSavedRelationshipStudy(raw, signature)) {
        setStep(4);
        setPersistence("saved");
        setRestored(true);
      } else setPersistence("available");
    } catch {
      setPersistence("unavailable");
    }
  }, [storageKey, signature]);

  useEffect(() => {
    if (initialFocus.current) {
      initialFocus.current = false;
      return;
    }
    scroller.current?.scrollTo({ top: 0 });
    if (step === 2 && !revealed) input.current?.focus({ preventScroll: true });
    else heading.current?.focus({ preventScroll: true });
  }, [step, revealed]);

  const reset = () => {
    try {
      window.localStorage.removeItem(storageKey);
      setPersistence("available");
    } catch {
      setPersistence("unavailable");
    }
    setStep(1);
    setEntry("");
    setError("");
    setRevealed(false);
    setGuardChoice(null);
    setRestored(false);
    scroller.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  };

  const submitRecall = (event: FormEvent) => {
    event.preventDefault();
    if (revealed || step !== 2) return;
    const result = validateRelationshipRecall(entry, lesson.codes);
    if (result.correct) {
      setError("");
      setEntry("");
      setStep(3);
      return;
    }
    const messages = {
      empty: multiple ? "Enter every code." : "Enter the code.",
      malformed: "Digits only. Separate codes with a comma or space.",
      duplicate: "Enter each code once.",
      incomplete: "One or more codes are missing.",
      wrong: "Not quite. Try again or take a peek.",
      "invalid-target": "These codes need checking. Open Details.",
    };
    setError(messages[result.reason]);
    input.current?.focus();
  };

  const chooseGuard = (choice: string) => {
    if (step !== 3) return;
    setGuardChoice(choice);
    if (choice !== "verify") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, signature, completedAt: new Date().toISOString() }));
      setPersistence("saved");
    } catch {
      setPersistence("unavailable");
    }
    setStep(4);
  };

  const lookAgain = () => {
    setStep(1);
    setEntry("");
    setError("");
    setRevealed(false);
    setGuardChoice(null);
  };

  return (
    <><div className="app relationshipApp relationshipCompactApp" data-relationship-step={step}>
      <header className="topbar">
        <span aria-hidden="true" />
        <div className="progress" aria-label={`Step ${step} of 4: ${steps[step - 1]}`}>
          <span className="progressLabel">Step <b>{step} of 4</b></span>
          <div className="progressDots" aria-hidden="true">{steps.map((label, index) => <i className={`${index + 1 <= step ? "active" : ""}${index + 1 === step ? " current" : ""}`} key={label} />)}</div>
        </div>
        <div className="topActions">
          <button ref={sheetTrigger} type="button" className="headerButton" onClick={() => setSheetOpen(true)} aria-label="Open listing details" aria-haspopup="dialog"><BookOpen aria-hidden="true" /><span>Details</span></button>
          <button type="button" className="headerButton" onClick={reset} aria-label="Restart relationship study and clear its saved result"><RotateCcw aria-hidden="true" /><span>Restart</span></button>
        </div>
      </header>

      <main className="workspace">
        <figure className="productStage">
          <div className="photoStack">
            {failedImage === lesson.photo.src ? <div className="relationshipImageFailure" role="status"><ImageOff aria-hidden="true" /><span>Image unavailable</span><button type="button" onClick={() => setFailedImage(null)}>Retry image</button></div> : <Image className="productPhoto active" src={lesson.photo.src} alt={step === 2 ? `Reference photo of ${lesson.title}; check the listing before checkout.` : lesson.photo.alt} fill sizes="(max-width: 980px) 100vw, 55vw" preload unoptimized style={{ objectPosition: lesson.photo.focus ?? "50% 50%" }} onError={() => setFailedImage(lesson.photo.src)} />}
            <div className="photoWash" aria-hidden="true" />
          </div>
          <div className="mediaBadgeRow"><span className="badge">Listing practice</span></div>
          <figcaption className="photoCaption"><span className="familyLabel">{pages}</span><h1>{lesson.title}</h1></figcaption>
        </figure>

        <section className="lessonCard relationshipCard" aria-labelledby="relationship-heading">
          <div className="lessonScroller" ref={scroller}>
            <div className={`lessonView relationshipView${step === 4 ? " successView" : ""}`}>
              <p className="kicker">{step === 4 ? "Listing" : steps[step - 1]}</p>
              <h2 id="relationship-heading" ref={heading} tabIndex={-1}>{step === 1 ? multiple ? "Keep the codes together." : "Remember this listing." : step === 2 ? multiple ? `Enter all ${lesson.codes.length} codes.` : "Enter the recorded code." : step === 3 ? "Before you ring it up?" : "Studied."}</h2>

              {step === 1 && <>
                <p className="relationshipCodeLabel">{multiple ? "Recorded codes" : "Recorded code"}</p>
                <CodeSet codes={lesson.codes} />
                <p className="relationshipCompactNote">{lesson.relationKind === "shared-code" ? "Different labels can share a code." : "A matching label can have different codes."}</p>
              </>}

              {step === 2 && <>
                {revealed ? <div className="relationshipRepair" role="status"><CodeSet codes={lesson.codes} /><p>Look once. Then try again.</p></div> : <form id="relationship-recall" onSubmit={submitRecall} className="relationshipRecall" noValidate>
                  <label htmlFor="relationship-codes" className="relationshipSrOnly">{multiple ? `All ${lesson.codes.length} recorded codes, in any order` : "Recorded code"}</label>
                  <input ref={input} id="relationship-codes" type="text" inputMode={multiple ? "text" : "numeric"} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} value={entry} onChange={(event) => { setEntry(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={`relationship-entry-help${error ? " relationship-entry-error" : ""}`} />
                  <p id="relationship-entry-help" className={multiple ? undefined : "relationshipSrOnly"}>{multiple ? <>Any order. Separate with a comma or space.<span className="relationshipSrOnly"> Keep any leading zeros.</span></> : "Keep any leading zeros."}</p>
                  {error && <p className="relationshipError" id="relationship-entry-error" role="alert">{error}</p>}
                </form>}
              </>}

              {step === 3 && <>
                <div className="choiceGrid relationshipChoices" role="group" aria-label="Checkout choices">
                  <button type="button" className={`choiceButton${guardChoice === "photo" ? " wrong" : ""}`} onClick={() => chooseGuard("photo")}><span className="choiceVisual"><Eye aria-hidden="true" /></span><span className="choiceCopy"><b>Go by the picture</b></span><ArrowRight className="choiceArrow" aria-hidden="true" /></button>
                  <button type="button" className="choiceButton" onClick={() => chooseGuard("verify")}><span className="choiceVisual"><Store aria-hidden="true" /></span><span className="choiceCopy"><b>Check the store listing</b></span><ArrowRight className="choiceArrow" aria-hidden="true" /></button>
                  <button type="button" className={`choiceButton${guardChoice === "interchangeable" ? " wrong" : ""}`} onClick={() => chooseGuard("interchangeable")}><span className="choiceVisual"><Copy aria-hidden="true" /></span><span className="choiceCopy"><b>Treat related items as the same</b></span><ArrowRight className="choiceArrow" aria-hidden="true" /></button>
                </div>
                {guardChoice && guardChoice !== "verify" && <p className="relationshipError" role="alert">{guardChoice === "photo" ? "A picture can't confirm the code." : "Related labels aren't interchangeable."} Try again.</p>}
              </>}

              {step === 4 && <>
                <div className="relationshipSuccess relationshipCompactSuccess" aria-hidden="true"><Check /></div>
                <p className="relationshipFinishNote"><ShieldCheck aria-hidden="true" />Still check the item, code and unit in store.</p>
                {persistence === "saved" && <p className="relationshipQuiet" role="status">{restored ? "Studied on this device." : "Saved on this device."}</p>}
              </>}
              {persistence === "unavailable" && <p className="relationshipPersistence" role="status">Progress can't be saved on this device.</p>}
            </div>
          </div>

          <div className={`actionDock${(step === 2 && !revealed) || step === 4 ? " two" : ""}`}>
            {step === 1 && <button type="button" className="primaryAction" onClick={() => setStep(2)}>Start <ArrowRight aria-hidden="true" /></button>}
            {step === 2 && !revealed && <><button type="button" className="secondaryAction" onClick={() => { setError(""); setRevealed(true); }}>Peek</button><button type="submit" form="relationship-recall" className="primaryAction">Check</button></>}
            {step === 2 && revealed && <button type="button" className="primaryAction" onClick={() => { setEntry(""); setError(""); setRevealed(false); }}>Try again</button>}
            {step === 3 && <button type="button" className="secondaryAction" onClick={lookAgain}>Look again</button>}
            {step === 4 && <><button type="button" className="secondaryAction" onClick={reset}>Study again</button><Link className="primaryAction" href="/">Done <ArrowRight aria-hidden="true" /></Link></>}
          </div>
        </section>
      </main>
    </div><RelationshipSheet lesson={lesson} open={sheetOpen} onClose={closeSheet} /></>
  );
}
