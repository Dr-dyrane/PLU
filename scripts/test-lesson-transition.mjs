import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const source = await readFile(new URL("../lib/trace/lesson-transition.ts", import.meta.url), "utf8");
const { createLessonTransition } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`);

function fakeClock() {
  let now = 0;
  let id = 0;
  const timers = new Map();
  return {
    setTimeout(callback, delay) { const timer = ++id; timers.set(timer, { callback, at: now + delay }); return timer; },
    clearTimeout(timer) { timers.delete(timer); },
    callbacks: () => [...timers.values()].map(timer => timer.callback),
    size: () => timers.size,
    tick(delay) {
      const target = now + delay;
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [timer, task] = next;
        timers.delete(timer);
        now = task.at;
        task.callback();
      }
      now = target;
    },
  };
}

const clock = fakeClock();
const transition = createLessonTransition(clock);
let question = 0;
assert.equal(transition.begin(360, () => { question += 1; }), true);
assert.equal(transition.isPending(), true, "Lock is synchronous, before a React render");
for (let repeat = 0; repeat < 10; repeat += 1) assert.equal(transition.begin(360, () => { question += 1; }), false);
clock.tick(359);
assert.equal(question, 0);
clock.tick(1);
assert.equal(question, 1, "Repeated choice input advances only one question");
assert.equal(transition.isPending(), false);

let wrongFeedback = true;
assert.equal(transition.begin(430, () => { wrongFeedback = false; }), true);
assert.equal(transition.begin(360, () => { question += 1; }), false, "Wrong-answer feedback cannot race a second choice");
clock.tick(430);
assert.equal(wrongFeedback, false);
assert.equal(question, 1);

let step = 4;
let effects = 0;
transition.begin(420, () => { step = 5; });
transition.schedule(() => { effects += 1; }, 1050);
transition.schedule(() => { effects += 1; }, 70);
assert.equal(transition.begin(420, () => { step = 5; }), false, "Final practice digit locks additional input");
const staleCallbacks = clock.callbacks();
transition.cancelAll();
step = 1;
assert.equal(clock.size(), 0, "Restart or unmount clears advance, feedback and sound timers");
assert.equal(transition.isPending(), false);
clock.tick(2000);
assert.equal(step, 1);
assert.equal(effects, 0);

transition.begin(360, () => { question += 1; });
for (const stale of staleCallbacks) stale();
assert.equal(step, 1, "Already queued callbacks cannot advance a reset or replacement session");
assert.equal(effects, 0);
assert.equal(transition.isPending(), true, "An old callback cannot release the new session lock");
clock.tick(360);
assert.equal(question, 2);
assert.equal(transition.isPending(), false);

const cancelFeedback = transition.schedule(() => { effects += 10; }, 50);
cancelFeedback();
transition.schedule(() => { effects += 1; }, 50);
clock.tick(50);
assert.equal(effects, 1, "Replacing a toast cancels only that toast");
transition.begin(420, () => { step = 5; });
clock.tick(419);
assert.equal(step, 1);
clock.tick(1);
assert.equal(step, 5);
transition.cancelAll();

const ui = await readFile(new URL("../components/canon/PluLesson.tsx", import.meta.url), "utf8");
for (const required of ["transition.cancelAll()", "stepRef.current !== 2", "stepRef.current !== 4", "wrongChunkRef.current !== null", "completeRef.current", "sheetOpenRef.current", "disabled={pending}", "<fieldset disabled={pending}", "beginTransition(correct ? 360 : 430", "beginTransition(420", "traceEntryRef.current = next", "recallEntryRef.current += digit", "[story.id, resetSession, transition]", "<LessonFinishActions next={nextLesson ?? null}", 'retryLabel="Run again"', "<ProductSheet"]) {
  assert.ok(ui.includes(required), `Lesson interaction contract missing: ${required}`);
}
assert.equal(/(?:window\.)?setTimeout\(/.test(ui), false, "Every lesson timeout belongs to the session fence");
assert.ok(ui.includes('window.localStorage.setItem(`plu:complete:${story.id}`, JSON.stringify({ completedAt: new Date().toISOString() }))'), "Exact completion storage remains unchanged");
assert.ok(ui.includes("if (recallEntryRef.current !== code)"), "Recall still compares the exact catalog code");
console.log("Lesson transitions: immediate locks, repeated-input protection, timer cancellation, stale-session fencing, and finish integration passed.");
