"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chunkPluCode } from "@/lib/mnemonic";
import { recordAttempt, resetProgress, scheduleReview } from "@/lib/progress";
import { reviewIntervals } from "@/lib/scheduler";
import type { PluLesson, ReviewRating } from "@/types/plu";
import { CorrectionPhase } from "@/components/trainer/CorrectionPhase";
import { Header } from "@/components/trainer/Header";
import { MemoryHook } from "@/components/trainer/MemoryHook";
import { ObservePhase } from "@/components/trainer/ObservePhase";
import { ProductVisual } from "@/components/trainer/ProductVisual";
import { RecallPhase } from "@/components/trainer/RecallPhase";
import { SuccessPhase } from "@/components/trainer/SuccessPhase";

type Phase = "observe" | "recall" | "correction" | "success";

export function PluTrainer({ lesson }: { lesson: PluLesson }) {
  const [phase, setPhase] = useState<Phase>("observe");
  const [entry, setEntry] = useState("");
  const [hintShown, setHintShown] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [toast, setToast] = useState("");
  const [progress, setProgress] = useState(Math.max(4, (lesson.sequence / lesson.deckSize) * 100));
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunks = useMemo(() => chunkPluCode(lesson.code), [lesson.code]);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const moveTo = useCallback((next: Phase) => {
    setPhase(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const startRecall = useCallback(() => {
    setEntry("");
    setHintShown(false);
    moveTo("recall");
  }, [moveTo]);

  const appendDigit = useCallback((digit: string) => {
    if (phase !== "recall") return;
    setEntry((current) => current.length < lesson.code.length ? `${current}${digit}` : current);
  }, [lesson.code.length, phase]);

  const deleteDigit = useCallback(() => { if (phase === "recall") setEntry((value) => value.slice(0, -1)); }, [phase]);
  const clearEntry = useCallback(() => { if (phase === "recall") setEntry(""); }, [phase]);

  const submitAnswer = useCallback(() => {
    if (phase !== "recall" || entry.length !== lesson.code.length) return;
    const correct = entry === lesson.code;
    recordAttempt(lesson.id, correct);
    if (correct) return moveTo("success");
    setShaking(true);
    window.setTimeout(() => setShaking(false), 400);
    window.setTimeout(() => moveTo("correction"), 250);
  }, [entry, lesson.code, lesson.id, moveTo, phase]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (phase !== "recall") return;
      if (/^\d$/.test(event.key)) appendDigit(event.key);
      else if (event.key === "Backspace") deleteDigit();
      else if (event.key === "Escape") clearEntry();
      else if (event.key === "Enter") submitAnswer();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [appendDigit, clearEntry, deleteDigit, phase, submitAnswer]);

  const rateCard = (rating: ReviewRating) => {
    scheduleReview(lesson.id, rating);
    setProgress(Math.max(8, ((lesson.sequence + 1) / lesson.deckSize) * 100));
    showToast(reviewIntervals[rating].label);
  };

  const resetLesson = () => {
    setEntry(""); setHintShown(false);
    setProgress(Math.max(4, (lesson.sequence / lesson.deckSize) * 100));
    resetProgress(lesson.id); moveTo("observe"); showToast("Lesson reset");
  };

  const lessonClass = ["lesson", phase === "recall" ? "recall-mode" : "", phase === "success" ? "success-mode" : ""].filter(Boolean).join(" ");

  return (
    <>
      <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" />
      <main className="shell">
        <Header sequence={lesson.sequence} deckSize={lesson.deckSize} progress={progress} onReset={resetLesson} />
        <section className={lessonClass} id="lesson" aria-live="polite">
          <ProductVisual lesson={lesson} />
          <div className="interaction-column">
            {phase === "observe" && <ObservePhase name={lesson.name} code={lesson.code} chunks={chunks} onStart={startRecall} />}
            {phase === "recall" && <RecallPhase codeLength={lesson.code.length} entry={entry} hint={lesson.recognitionHint} hintShown={hintShown} shaking={shaking} onDigit={appendDigit} onDelete={deleteDigit} onClear={clearEntry} onToggleHint={() => setHintShown((value) => !value)} onSubmit={submitAnswer} />}
            {phase === "correction" && <CorrectionPhase name={lesson.name} code={lesson.code} onRetry={startRecall} />}
            {phase === "success" && <SuccessPhase code={lesson.code} contrast={lesson.contrast} onRate={rateCard} />}
            <MemoryHook hook={lesson.memoryHook} />
          </div>
        </section>
        <footer className="footer-note"><span>Reusable loop</span><strong>See → Hide → Recall → Correct → Contrast → Schedule</strong></footer>
      </main>
      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
