import type {
  CompetenceOutcome,
  LearningEvent,
  LearningState,
} from "@/types/trace";

export function createInitialLearningState(): LearningState {
  return {
    stage: "meet",
    identityAttempts: 0,
    identityCorrect: 0,
    identityMisses: 0,
    traceAttempts: 0,
    traceMisses: 0,
    recallAttempts: 0,
    recallMisses: 0,
    supportUses: 0,
    firstTryRecall: null,
    completed: false,
    processedEventIds: [],
  };
}

function withEventId(state: LearningState, eventId: string): LearningState {
  return {
    ...state,
    processedEventIds: [...state.processedEventIds, eventId].slice(-128),
  };
}

/**
 * Pure and idempotent event reducer.
 * Applying an event with the same ID twice has the same result as applying it once.
 */
export function reduceLearningState(
  state: LearningState,
  event: LearningEvent,
): LearningState {
  if (state.processedEventIds.includes(event.id)) return state;

  const next = withEventId(state, event.id);

  switch (event.type) {
    case "START":
      return { ...next, stage: "resolve" };

    case "IDENTITY_RESPONSE":
      return {
        ...next,
        identityAttempts: state.identityAttempts + 1,
        identityCorrect: state.identityCorrect + (event.correct ? 1 : 0),
        identityMisses: state.identityMisses + (event.correct ? 0 : 1),
      };

    case "IDENTITY_COMPLETE":
      return { ...next, stage: "attach" };

    case "BEGIN_TRACE":
      return { ...next, stage: "trace" };

    case "TRACE_RESPONSE":
      return {
        ...next,
        stage: event.correct ? "recall" : "trace",
        traceAttempts: state.traceAttempts + 1,
        traceMisses: state.traceMisses + (event.correct ? 0 : 1),
      };

    case "RECALL_RESPONSE": {
      const firstTryRecall =
        state.firstTryRecall === null
          ? event.correct && state.recallAttempts === 0
          : state.firstTryRecall;

      return {
        ...next,
        stage: event.correct ? "complete" : "repair",
        recallAttempts: state.recallAttempts + 1,
        recallMisses: state.recallMisses + (event.correct ? 0 : 1),
        firstTryRecall,
        completed: event.correct,
      };
    }

    case "RETRY":
      return { ...next, stage: "recall" };

    case "SUPPORT_OPENED":
      return { ...next, supportUses: state.supportUses + 1 };

    case "RESET":
      return {
        ...createInitialLearningState(),
        processedEventIds: [event.id],
      };

    default:
      return next;
  }
}

export function inferCompetenceOutcome(state: LearningState): CompetenceOutcome {
  if (
    state.completed &&
    state.recallMisses === 0 &&
    state.traceMisses === 0 &&
    state.supportUses === 0
  ) {
    return "clean";
  }

  if (state.completed && state.recallMisses === 0) return "guided";
  return "recovered";
}

export function competenceScore(state: LearningState): number {
  const identityBase = state.identityCorrect * 10;
  const traceBase = state.traceAttempts > 0 ? 25 : 0;
  const recallBase = state.completed ? 45 : 0;
  const penalties =
    state.identityMisses * 4 +
    state.traceMisses * 8 +
    state.recallMisses * 12 +
    state.supportUses * 5;

  return Math.max(0, Math.min(100, identityBase + traceBase + recallBase - penalties));
}
