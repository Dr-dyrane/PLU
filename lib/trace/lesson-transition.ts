type Timer = ReturnType<typeof setTimeout>;
type Clock = { setTimeout: (callback: () => void, delay: number) => Timer; clearTimeout: (timer: Timer) => void };

/** A small session fence for feedback delays, not a second lesson state machine. */
export function createLessonTransition(clock: Clock = { setTimeout: (callback, delay) => setTimeout(callback, delay), clearTimeout: (timer) => clearTimeout(timer) }) {
  const timers = new Set<Timer>();
  let generation = 0;
  let pending = false;

  const schedule = (callback: () => void, delay: number) => {
    const session = generation;
    const timer = clock.setTimeout(() => {
      if (session !== generation || !timers.delete(timer)) return;
      callback();
    }, delay);
    timers.add(timer);
    return () => { timers.delete(timer); clock.clearTimeout(timer); };
  };

  return {
    schedule,
    isPending: () => pending,
    begin(delay: number, callback: () => void): boolean {
      if (pending) return false;
      pending = true;
      schedule(() => { pending = false; callback(); }, delay);
      return true;
    },
    cancelAll() {
      generation += 1;
      pending = false;
      for (const timer of timers) clock.clearTimeout(timer);
      timers.clear();
    },
  };
}
