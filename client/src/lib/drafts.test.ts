import { afterEach, describe, expect, it } from "vitest";

import { clearDraft, draftKey, loadDraft, saveDraft } from "./drafts";

describe("draft persistence", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("saves and loads a draft", () => {
    saveDraft(draftKey(), { title: "Draft", content: "Work in progress" });

    expect(loadDraft(draftKey())).toMatchObject({
      title: "Draft",
      content: "Work in progress",
    });
  });

  it("clears a stored draft", () => {
    saveDraft(draftKey("note-1"), { title: "A", content: "B" });
    clearDraft(draftKey("note-1"));

    expect(loadDraft(draftKey("note-1"))).toBeNull();
  });
});
