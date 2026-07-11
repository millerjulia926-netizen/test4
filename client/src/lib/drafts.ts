export type NoteDraft = {
  title: string;
  content: string;
  updatedAt: string;
};

const DRAFT_PREFIX = "notes:draft:";

export function draftKey(noteId?: string): string {
  return `${DRAFT_PREFIX}${noteId ?? "new"}`;
}

export function saveDraft(key: string, draft: Omit<NoteDraft, "updatedAt">): void {
  const payload: NoteDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

export function loadDraft(key: string): NoteDraft | null {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as NoteDraft;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  localStorage.removeItem(key);
}

export function isDraftNewerThanServer(draft: NoteDraft, serverUpdatedAt: string): boolean {
  return new Date(draft.updatedAt).getTime() > new Date(serverUpdatedAt).getTime();
}
