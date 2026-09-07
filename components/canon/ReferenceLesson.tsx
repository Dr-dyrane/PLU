"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Eye, ImageOff, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { canRecallReferenceCode, isSavedReferenceStudy, REFERENCE_STUDY_EVENT, referenceSignature, referenceSourceChoices, referenceStorageKey, validateReferenceCodeRecall } from "@/lib/trace/reference-study";
import type { ReferenceLessonData } from "@/types/reference";

type Step = 1 | 2 | 3 | 4;
type Persistence = "checking" | "available" | "saved" | "unavailable";
const steps = ["Inspect", "Recall", "Checkout boundary", "Studied"];

function pagesLabel(pages: number[]) {
  return pages.length ? `Source ${pages.length === 1 ? "page" : "pages"} ${pages.join(", ")}` : "Source page not recorded";
}

function saleLabel(soldBy: ReferenceLessonData["soldBy"]) {
  return soldBy === "Weight" ? "Sold by weight" : soldBy === "Each" ? "Sold each" : "Sale unit not recorded";
}

function notifyProgress(catalogId: string) {
  window.dispatchEvent(new CustomEvent(REFERENCE_STUDY_EVENT, { detail: { catalogId } }));
}

export function ReferenceLesson({ lesson }: { lesson: ReferenceLessonData }) {
  const [step, setStep] = useState<Step>(1);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [sourceChoice, setSourceChoice] = useState<string | null>(null);
  const [guardChoice, setGuardChoice] = useState<string | null>(null);
  const [persistence, setPersistence] = useState<Persistence>("checking");
  const [restored, setRestored] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const storageKey = referenceStorageKey(lesson.catalogId);
  const signature = referenceSignature(lesson);
  const codeRecall = canRecallReferenceCode(lesson);
  const illustrated = lesson.media.kind === "generated-illustration";
  const imageUnavailable = failedImage === lesson.media.src;

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
      unverified: "This source code is not a verified recall target. Review the source note instead.",
      empty: "Enter the recorded code for this exact source listing.",
      malformed: "Enter digits only. Keep any leading zeros.",
      wrong: "That is not this source listing’s recorded code. Try again, or reveal it to review.",
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
      setError(choice === "verified" ? "The source still has an unresolved requirement. Choose the note that belongs to this listing." : "A reference image cannot confirm a store’s code, exact variety, or sale unit. Choose the source note.");
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
    <div className="app relationshipApp referenceApp" data-reference-step={step} data-reference-mode={codeRecall ? "recorded-code" : "source-note"}>
      <header className="topbar">
        <span aria-hidden="true" />
        <div className="progress" aria-label={`Step ${step} of 4: ${steps[step - 1]}`}>
          <span className="progressLabel">Step <b>{step} of 4</b></span>
          <div className="progressDots" aria-hidden="true">{steps.map((label, index) => <i className={`${index + 1 <= step ? "active" : ""}${index + 1 === step ? " current" : ""}`} key={label} />)}</div>
        </div>
        <div className="topActions"><button type="button" className="headerButton" onClick={reset} aria-label="Restart reference study and clear its saved result"><RotateCcw aria-hidden="true" /><span>Restart</span></button></div>
      </header>

      <main className="workspace">
        <figure className="productStage referenceStage">
          <div className="photoStack">
            {imageUnavailable ? <div className="referenceImageFailure" role="status"><ImageOff aria-hidden="true" /><span>{illustrated ? "Illustration unavailable" : "Reference photograph unavailable"}</span><small>The source notes remain available below.</small><button type="button" onClick={() => setFailedImage(null)}>Retry image</button></div> : <Image className="referencePhoto" src={lesson.media.src} alt={step === 2 ? `${illustrated ? "AI illustration" : "Reference photograph"} accompanying the source listing ${lesson.title}; not proof of exact store identity or code.` : lesson.media.alt} fill sizes="(max-width: 980px) 100vw, 55vw" priority unoptimized onError={() => setFailedImage(lesson.media.src)} />}
            <div className="photoWash" aria-hidden="true" />
          </div>
          <div className="mediaBadgeRow"><span className="badge">{illustrated ? "AI illustration" : "Reference photograph"}</span><span className="badge referenceOnlyBadge">Reference only</span></div>
          <figcaption className="photoCaption">
            <span className="familyLabel">Exact source label · reference study</span>
            <h1>{lesson.title}</h1>
            <div className="factChips"><span className="factChip">{pagesLabel(lesson.sourcePages)}</span><span className="factChip">{saleLabel(lesson.soldBy)}</span></div>
          </figcaption>
        </figure>

        <section className="lessonCard relationshipCard referenceCard" aria-labelledby="reference-heading">
          <div className="lessonScroller" ref={scroller}>
            <div className="lessonView">
              <p className="kicker">{steps[step - 1]}</p>
              <h2 id="reference-heading" ref={heading} tabIndex={-1}>{step === 1 ? "Learn what the source supports." : step === 2 ? codeRecall ? "Recall the recorded code." : "Keep the source note attached." : step === 3 ? "Before checkout…" : "Reference studied."}</h2>

              {step === 1 && <>
                <p className="relationshipLead">{lesson.visualCue}</p>
                <div className="relationshipTarget">
                  <strong>{lesson.title}</strong>
                  <span>{pagesLabel(lesson.sourcePages)} · {saleLabel(lesson.soldBy)}</span>
                  {codeRecall ? <><div className="relationshipCodes" aria-label="Recorded source code, reference only"><code>{lesson.codes[0]}</code></div><small>Recorded code for this labeled source row. The reference image does not verify the exact store item.</small></> : <p className="referenceSourceIssue"><BookOpen aria-hidden="true" /><span>{lesson.sourceIssue}</span></p>}
                </div>
                <p className="relationshipNote">{lesson.identityNote}</p>
                <p className="relationshipCaveat"><ShieldCheck aria-hidden="true" /><span>{lesson.media.claimBoundary}</span></p>
                <details className="relationshipDetails" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); event.stopPropagation(); } }}>
                  <summary>Source notes &amp; image credit</summary>
                  <div className="relationshipSource">
                    <p>{lesson.sourceIssue}</p>
                    <p>{lesson.checkoutCaveat}</p>
                    {!codeRecall && <p>Unverified source text, not a recall answer: <span className="referenceRawCode">{lesson.sourceCodeText || "No code recorded"}</span></p>}
                    <p><strong>{illustrated ? "AI-generated illustration" : "Reviewed reference photograph"}</strong> · {lesson.media.author}</p>
                    <p>{lesson.media.licenseUrl ? <a href={lesson.media.licenseUrl} target="_blank" rel="noopener noreferrer">{lesson.media.license}<span className="relationshipSrOnly"> (opens a new tab)</span></a> : lesson.media.license}</p>
                    <a href={lesson.media.sourceUrl} target="_blank" rel="noopener noreferrer">Image provenance <span aria-hidden="true">↗</span><span className="relationshipSrOnly"> (opens a new tab)</span></a>
                    {lesson.evidenceSources.length > 0 && <ul className="referenceSources">{lesson.evidenceSources.map((source) => <li key={`${source.title}:${source.url}`}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<span className="relationshipSrOnly"> (opens a new tab)</span></a></li>)}</ul>}
                  </div>
                </details>
              </>}

              {step === 2 && <>
                <p className="relationshipLead">For <strong>{lesson.title}</strong> · {pagesLabel(lesson.sourcePages).toLowerCase()}.</p>
                {revealed ? <div className="relationshipRepair" role="status">
                  <p>{codeRecall ? "Review the recorded code for this exact source label." : "Review the unresolved note for this exact source label."}</p>
                  {codeRecall ? <div className="relationshipCodes"><code>{lesson.codes[0]}</code></div> : <p>{lesson.sourceIssue}</p>}
                  <p>Hide the answer, then recall it again.</p>
                </div> : codeRecall ? <form id="reference-recall" onSubmit={submitRecall} className="relationshipRecall" noValidate>
                  <label htmlFor="reference-code">Recorded source code</label>
                  <input ref={input} id="reference-code" type="text" inputMode="numeric" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} value={entry} onChange={(event) => { setEntry(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={`reference-entry-help${error ? " reference-entry-error" : ""}`} />
                  <p id="reference-entry-help">Enter the digits exactly, keeping any leading zeros. This is label-to-code reference practice.</p>
                  {error && <p className="relationshipError" id="reference-entry-error" role="alert">{error}</p>}
                </form> : <>
                  <p className="relationshipNote">Which source note belongs to this listing?</p>
                  <div className="choiceGrid relationshipChoices referenceSourceChoices" role="group" aria-label="Source note choices">{referenceSourceChoices(lesson).map((choice) => <button key={choice.id} type="button" className={`choiceButton${sourceChoice === choice.id && choice.id !== "source" ? " wrong" : ""}`} onClick={() => chooseSource(choice.id)}><span className="choiceCopy"><b>{choice.text}</b></span></button>)}</div>
                  {error && <p className="relationshipError" role="alert">{error}</p>}
                </>}
                <p className="relationshipQuiet">{codeRecall ? "A recorded label-to-code answer is not photo verification or a live-checkout approval." : "An unresolved code is not a memory target. Learn the source boundary without guessing digits."}</p>
              </>}

              {step === 3 && <>
                <p className="relationshipLead">{lesson.checkoutCaveat}</p>
                <p className="relationshipNote">What is the safe next action for this listing?</p>
                <div className="choiceGrid relationshipChoices" role="group" aria-label="Checkout boundary choices">
                  <button type="button" className={`choiceButton${guardChoice === "photo" ? " wrong" : ""}`} onClick={() => chooseGuard("photo")}><Eye aria-hidden="true" /><span className="choiceCopy"><b>Use this image as proof of the checkout code.</b></span></button>
                  <button type="button" className="choiceButton" onClick={() => chooseGuard("verify")}><ShieldCheck aria-hidden="true" /><span className="choiceCopy"><b>Confirm the exact store item, code, and sale unit before use.</b></span></button>
                  <button type="button" className={`choiceButton${guardChoice === "guess" ? " wrong" : ""}`} onClick={() => chooseGuard("guess")}><ArrowRight aria-hidden="true" /><span className="choiceCopy"><b>Choose the nearest-looking item and borrow its code.</b></span></button>
                </div>
                {guardChoice && guardChoice !== "verify" && <p className="relationshipError" role="alert">{guardChoice === "photo" ? "A reference image cannot verify an exact checkout mapping." : "Related-looking products can have different store codes. Do not borrow a code."} Choose again.</p>}
              </>}

              {step === 4 && <>
                <div className="relationshipSuccess" aria-hidden="true"><Check /></div>
                <p className="relationshipLead">{restored ? "Previously studied on this device: " : "You studied: "}<strong>{lesson.title}</strong>.</p>
                <p className="relationshipNote">{codeRecall ? "Recorded label-to-code recall and the checkout boundary." : "The source note and the checkout boundary. No uncertain code was memorized."}</p>
                <p className="relationshipCaveat"><ShieldCheck aria-hidden="true" /><span>Reference study is complete. The source restriction remains; this is not checkout-ready mastery.</span></p>
                <p className="relationshipNote">{lesson.sourceIssue}</p>
                {persistence === "saved" && <p className="relationshipQuiet" role="status">Reference study saved on this device, separately from checkout lessons and relationship studies.</p>}
                <Link className="referenceHomeLink" href="/">Back to products <ArrowRight aria-hidden="true" /></Link>
              </>}

              {persistence === "unavailable" && <p className="relationshipPersistence" role="status">Device storage is unavailable. You can study, but this result or a reset may not persist after refresh.</p>}
            </div>
          </div>

          <div className={`actionDock${step === 2 && !revealed && codeRecall ? " two" : ""}`}>
            {step === 1 && <button type="button" className="primaryAction" onClick={() => setStep(2)}>Try the recall <ArrowRight aria-hidden="true" /></button>}
            {step === 2 && !revealed && codeRecall && <><button type="button" className="secondaryAction" onClick={() => { setError(""); setRevealed(true); }}>Reveal answer</button><button type="submit" form="reference-recall" className="primaryAction">Check answer</button></>}
            {step === 2 && !revealed && !codeRecall && <button type="button" className="secondaryAction" onClick={() => { setError(""); setRevealed(true); }}>Review source note</button>}
            {step === 2 && revealed && <button type="button" className="primaryAction" onClick={() => { setEntry(""); setError(""); setSourceChoice(null); setRevealed(false); }}>Hide answer &amp; try again</button>}
            {step === 3 && <button type="button" className="secondaryAction" onClick={returnToInspection}>Review this listing</button>}
            {step === 4 && <button type="button" className="primaryAction" onClick={reset}>Study again <RotateCcw aria-hidden="true" /></button>}
          </div>
        </section>
      </main>
    </div>
  );
}
