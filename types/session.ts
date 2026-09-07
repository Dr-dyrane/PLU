export interface CoreSessionItem {
  id: string;
  code: string;
}

/** Completed practice in this five-item session, not a retention or mastery score. */
export interface CoreSessionProgress {
  completedIds: string[];
  updatedAt: string;
}

export interface CoreSessionPayload extends CoreSessionProgress {
  version: 1;
  signature: string;
}
