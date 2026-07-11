import { describe, expect, it } from "vitest";

import { serializeNoteToMarkdown } from "../lib/note-export.js";

describe("serializeNoteToMarkdown", () => {
  it("serializes a note title and content", () => {
    const markdown = serializeNoteToMarkdown({
      title: "Meeting notes",
      content: "## Agenda\n\n- Launch plan",
    });

    expect(markdown).toContain("# Meeting notes");
    expect(markdown).toContain("## Agenda");
    expect(markdown).toContain("- Launch plan");
  });

  it("includes tags when provided", () => {
    const markdown = serializeNoteToMarkdown({
      title: "Ideas",
      content: "Brainstorm",
      tags: [{ name: "work" }, { name: "urgent" }],
    });

    expect(markdown).toContain("Tags: work, urgent");
  });
});
