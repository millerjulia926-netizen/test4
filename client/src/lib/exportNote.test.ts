import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadNoteMarkdown } from "./exportNote";

describe("downloadNoteMarkdown", () => {
  beforeEach(() => {
    localStorage.setItem("notes_access_token", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("# Title\n\nBody", { status: 200 })),
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:note"),
      revokeObjectURL: vi.fn(),
    });

    const anchor = {
      href: "",
      download: "",
      click: vi.fn(),
    };
    vi.spyOn(document, "createElement").mockReturnValue(anchor as unknown as HTMLElement);
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("downloads markdown from the export endpoint", async () => {
    await downloadNoteMarkdown("note-1", "My Note");

    expect(fetch).toHaveBeenCalledWith("/notes/note-1/export", {
      headers: { Authorization: "Bearer test-token" },
    });
    expect(document.createElement).toHaveBeenCalledWith("a");
  });
});
