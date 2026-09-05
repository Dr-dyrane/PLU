"use client";

import Image from "next/image";
import { ArrowRight, Check, Eye, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { isSavedRelationshipStudy, relationshipSignature, validateRelationshipRecall } from "@/lib/trace/relationship-recall";
import type { RelationshipLessonData } from "@/types/relationship";

type Step = 1 | 2 | 3 | 4;
type Persistence = "checking" | "available" | "saved" | "unavailable";
const steps = ["Compare", "Recall", "Checkout check", "Recalled"];

function pagesLabel(pages: number[]) {
  return pages.length ? `Source ${pages.length === 1 ? "page" : "pages"} ${pages.join(", ")}` : "Source page not recorded";
}

function saleLabel(soldBy: RelationshipLessonData["soldBy"]) {
  return soldBy === "Weight" ? "Sold by weight" : soldBy === "Each" ? "Sold each" : "Sale unit not recorded";
}

function CodeSet({ codes }: { codes: string[] }) {
  return <div className="relationshipCodes" aria-label="Complete code set for this source row">{codes.map((code) => <code key={code}>{code}</code>)}</div>;
}

export function RelationshipLesson({ lesson }: { lesson: RelationshipLessonData }) {
  const [step, setStep] = useState<Step>(1);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [guardChoice, setGuardChoice] = useState<string | null>(null);
  const [persistence, setPersistence] = useState<Persistence>("checking");
  const [restored, setRestored] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const initialFocus = useRef(true);
  const storageKey = `plu:relationship:${lesson.catalogId}`;
  const signature = relationshipSignature(lesson);
  const neighbors = lesson.members.filter((member) => member.catalogId !== lesson.catalogId);
  const multiple = lesson.codes.length > 1;

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
      empty: multiple ? "Enter the complete code set for this source row." : "Enter the code for this source row.",
      malformed: "Use digits only, with a comma or space between codes. Keep any leading zeros.",
      duplicate: "Enter each code once. Repeated codes do not complete the set.",
      incomplete: "That is not the complete set. Add every code recorded for this row.",
      wrong: "Not this source row’s exact answer. Try again, or reveal it to review.",
      "invalid-target": "This source row needs review before it can be recalled.",
    };
    setError(messages[result.reason]);
    input.current?.focus();
  };

  const chooseGuard = (choice: string) => {
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

  return (
    <div className="app relationshipApp" data-relationship-step={step}>
      <header className="topbar">
        <span aria-hidden="true" />
        <div className="progress" aria-label={`Step ${step} of 4: ${steps[step - 1]}`}>
          <span className="progressLabel">Step <b>{step} of 4</b></span>
          <div className="progressDots" aria-hidden="true">{steps.map((label, index) => <i className={`${index + 1 <= step ? "active" : ""}${index + 1 === step ? " current" : ""}`} key={label} />)}</div>
        </div>
        <div className="topActions"><button type="button" className="headerButton" onClick={reset} aria-label="Restart relationship study and clear its saved result"><RotateCcw aria-hidden="true" /><span>Restart</span></button></div>
      </header>

      <main className="workspace">
        <figure className="productStage">
          <div className="photoStack">
            <Image className="productPhoto active" src={lesson.photo.src} alt={step === 2 ? `Reference photograph for ${lesson.title}. A photograph alone cannot select the checkout code.` : lesson.photo.alt} fill sizes="(max-width: 980px) 100vw, 55vw" priority unoptimized style={{ objectPosition: lesson.photo.focus ?? "50% 50%" }} />
            <div className="photoWash" aria-hidden="true" />
          </div>
          <div className="mediaBadgeRow"><span className="badge">Relationship study</span></div>
          <figcaption className="photoCaption">
            <span className="familyLabel">Exact source listing</span>
            <h1>{lesson.title}</h1>
            <div className="factChips"><span className="factChip">{pagesLabel(lesson.sourcePages)}</span><span className="factChip">{saleLabel(lesson.soldBy)}</span></div>
          </figcaption>
        </figure>

        <section className="lessonCard relationshipCard" aria-labelledby="relationship-heading">
          <div className="lessonScroller" ref={scroller}>
            <div className="lessonView relationshipView">
              <p className="kicker">{steps[step - 1]}</p>
              <h2 id="relationship-heading" ref={heading} tabIndex={-1}>{step === 1 ? "Keep the listing attached." : step === 2 ? multiple ? "Recall the complete set." : "Recall this listing’s code." : step === 3 ? "Before you ring it up…" : "Mapping recalled."}</h2>

              {step === 1 && <>
                <p className="relationshipLead">{lesson.relationKind === "shared-code" ? "Different source labels share a code. That does not make the products interchangeable." : "A matching label can have different recorded codes. Learn this row without choosing a primary code."}</p>
                <div className="relationshipTarget">
                  <strong>{lesson.title}</strong>
                  <span>{pagesLabel(lesson.sourcePages)} · {saleLabel(lesson.soldBy)}</span>
                  <CodeSet codes={lesson.codes} />
                  {multiple && <small>All {lesson.codes.length} codes belong to this source row; their order is not tested.</small>}
                </div>
                <p className="relationshipNote">{lesson.qualifierNote}</p>
                {neighbors.length > 0 && <details className="relationshipDetails">
                  <summary>Compare {neighbors.length} related source {neighbors.length === 1 ? "row" : "rows"}</summary>
                  <ul className="relationshipMembers">{neighbors.map((member) => <li key={member.catalogId}>
                    <strong>{member.item}</strong>
                    <span>{pagesLabel(member.sourcePages)} · {saleLabel(member.soldBy)}</span>
                    <small>{member.status === "queued" ? "Source review — not verified" : member.status === "mapped" ? "Mapped source record — checkout selection unresolved" : "Recorded catalog mapping"}</small>
                    <CodeSet codes={member.codes} />
                    {member.flags.length > 0 && <small>Source notes: {member.flags.map((flag) => flag.replaceAll("-", " ")).join("; ")}</small>}
                  </li>)}</ul>
                </details>}
                <details className="relationshipDetails">
                  <summary>Source notes &amp; photo credit</summary>
                  <div className="relationshipSource">
                    <p>{lesson.reviewBasis}</p>
                    <p>{lesson.visualCue}</p>
                    <p>{lesson.checkoutCaveat}</p>
                    <a href={lesson.photo.source.url} target="_blank" rel="noopener noreferrer">{lesson.photo.source.label} <span aria-hidden="true">↗</span><span className="relationshipSrOnly"> (opens a new tab)</span></a>
                    <p>{lesson.photo.source.author} · {lesson.photo.source.license}</p>
                  </div>
                </details>
              </>}

              {step === 2 && <>
                <p className="relationshipLead">For <strong>{lesson.title}</strong> · {pagesLabel(lesson.sourcePages).toLowerCase()}.</p>
                {revealed ? <div className="relationshipRepair" role="status">
                  <p>Review this source row’s {multiple ? "complete set" : "code"}.</p>
                  <CodeSet codes={lesson.codes} />
                  <p>Hide the answer, then recall it again.</p>
                </div> : <form id="relationship-recall" onSubmit={submitRecall} className="relationshipRecall" noValidate>
                  <label htmlFor="relationship-codes">{multiple ? `All ${lesson.codes.length} recorded codes, in any order` : "Recorded code"}</label>
                  <input ref={input} id="relationship-codes" type="text" inputMode={multiple ? "text" : "numeric"} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} value={entry} onChange={(event) => { setEntry(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={`relationship-entry-help${error ? " relationship-entry-error" : ""}`} />
                  <p id="relationship-entry-help">{multiple ? "Separate codes with a comma or space. Enter each once." : "Enter the digits exactly."} Keep any leading zeros.</p>
                  {error && <p className="relationshipError" id="relationship-entry-error" role="alert">{error}</p>}
                </form>}
                <p className="relationshipQuiet">Recall applies to the labeled source row—not to an unlabeled photo or a live store listing.</p>
              </>}

              {step === 3 && <>
                <p className="relationshipLead">You recalled the source mapping. What still needs checking at a real checkout?</p>
                <div className="choiceGrid relationshipChoices" role="group" aria-label="Checkout verification choices">
                  <button type="button" className={`choiceButton${guardChoice === "photo" ? " wrong" : ""}`} onClick={() => chooseGuard("photo")}><Eye aria-hidden="true" /><span className="choiceCopy"><b>Use the photo alone to select a code.</b></span></button>
                  <button type="button" className="choiceButton" onClick={() => chooseGuard("verify")}><ShieldCheck aria-hidden="true" /><span className="choiceCopy"><b>Verify the exact store listing and sale unit.</b></span></button>
                  <button type="button" className={`choiceButton${guardChoice === "interchangeable" ? " wrong" : ""}`} onClick={() => chooseGuard("interchangeable")}><ArrowRight aria-hidden="true" /><span className="choiceCopy"><b>Treat related labels as interchangeable.</b></span></button>
                </div>
                {guardChoice && guardChoice !== "verify" && <p className="relationshipError" role="alert">{guardChoice === "photo" ? "A photo cannot establish the store’s exact listing or sale unit." : "A shared code or matching label does not establish interchangeable products."} Choose again.</p>}
              </>}

              {step === 4 && <>
                <div className="relationshipSuccess" aria-hidden="true"><Check /></div>
                <p className="relationshipLead">{restored ? "Previously recalled on this device: " : "You recalled: "}<strong>{lesson.title}</strong> · {pagesLabel(lesson.sourcePages).toLowerCase()}.</p>
                <CodeSet codes={lesson.codes} />
                <p className="relationshipCaveat"><ShieldCheck aria-hidden="true" /><span>This is source-mapping practice, not live-checkout verification or ready-lesson mastery. Verify the exact store listing and sale unit before use.</span></p>
                <p className="relationshipNote">{lesson.checkoutCaveat}</p>
                {persistence === "saved" && <p className="relationshipQuiet" role="status">Mapping recall saved on this device, separately from ready lessons.</p>}
              </>}
              {persistence === "unavailable" && <p className="relationshipPersistence" role="status">Device storage is unavailable. You can practice, but this result or a reset may not persist after refresh.</p>}
            </div>
          </div>

          {step !== 3 && <div className={`actionDock${step === 2 && !revealed ? " two" : ""}`}>
            {step === 1 && <button type="button" className="primaryAction" onClick={() => setStep(2)}>Recall this listing <ArrowRight aria-hidden="true" /></button>}
            {step === 2 && !revealed && <><button type="button" className="secondaryAction" onClick={() => { setError(""); setRevealed(true); }}>Reveal answer</button><button type="submit" form="relationship-recall" className="primaryAction">Check answer</button></>}
            {step === 2 && revealed && <button type="button" className="primaryAction" onClick={() => { setEntry(""); setError(""); setRevealed(false); }}>Hide answer &amp; try again</button>}
            {step === 4 && <button type="button" className="primaryAction" onClick={reset}>Practice again <RotateCcw aria-hidden="true" /></button>}
          </div>}
        </section>
      </main>
    </div>
  );
}
