import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import type { Note } from "../api/notes";
import { NotesList } from "./NotesList";

const sampleNotes: Note[] = [
  {
    id: "note-1",
    userId: "user-1",
    folderId: null,
    title: "Meeting notes",
    content: "Discuss roadmap and launch plan.",
    tags: [],
    createdAt: "2026-07-11T10:00:00.000Z",
    updatedAt: "2026-07-11T12:00:00.000Z",
  },
  {
    id: "note-2",
    userId: "user-1",
    folderId: null,
    title: "Ideas",
    content: "Add search and tags.",
    tags: [],
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-07-10T11:00:00.000Z",
  },
];

describe("NotesList", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an empty state", () => {
    render(
      <MemoryRouter>
        <NotesList notes={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("You do not have any notes yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create your first note" })).toHaveAttribute(
      "href",
      "/notes/new",
    );
  });

  it("renders note items with navigation links", () => {
    render(
      <MemoryRouter>
        <NotesList notes={sampleNotes} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Meeting notes")).toBeInTheDocument();
    expect(screen.getByText("Ideas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Discuss roadmap/i })).toHaveAttribute(
      "href",
      "/notes/note-1",
    );
    expect(screen.getByRole("link", { name: /Add search and tags/i })).toHaveAttribute(
      "href",
      "/notes/note-2",
    );
  });
});
