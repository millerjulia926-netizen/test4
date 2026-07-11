import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../auth/AuthContext";
import { draftKey, loadDraft } from "../lib/drafts";
import { NoteEditorPage } from "./NoteEditorPage";

vi.mock("../api/notes", async () => {
  const actual = await vi.importActual<typeof import("../api/notes")>("../api/notes");
  return {
    ...actual,
    getAccessToken: () => "test-token",
    createNote: vi.fn(async (input: { title: string; content: string }) => ({
      id: "note-123",
      userId: "user-1",
      folderId: null,
      title: input.title,
      content: input.content,
      createdAt: "2026-07-11T10:00:00.000Z",
      updatedAt: "2026-07-11T10:00:00.000Z",
    })),
    updateNote: vi.fn(async (id: string, input: { title?: string; content?: string }) => ({
      id,
      userId: "user-1",
      folderId: null,
      title: input.title ?? "Title",
      content: input.content ?? "",
      createdAt: "2026-07-11T10:00:00.000Z",
      updatedAt: "2026-07-11T10:01:00.000Z",
    })),
    fetchNote: vi.fn(async (id: string) => ({
      id,
      userId: "user-1",
      folderId: null,
      title: "Auto saved title",
      content: "Draft body",
      createdAt: "2026-07-11T10:00:00.000Z",
      updatedAt: "2026-07-11T10:00:00.000Z",
    })),
    login: vi.fn(),
    signup: vi.fn(),
  };
});

function renderNewNoteEditor() {
  return render(
    <MemoryRouter initialEntries={["/notes/new"]}>
      <AuthProvider>
        <Routes>
          <Route path="notes/new" element={<NoteEditorPage />} />
          <Route path="notes/:id/edit" element={<NoteEditorPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("NoteEditorPage auto-save", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem("notes_access_token", "test-token");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  it("debounces auto-save writes to the API", async () => {
    const notesApi = await import("../api/notes");

    renderNewNoteEditor();

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Note title"), {
        target: { value: "Auto saved title" },
      });
      fireEvent.change(screen.getByPlaceholderText("Start writing..."), {
        target: { value: "Draft body" },
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(notesApi.createNote).toHaveBeenCalledWith({
      title: "Auto saved title",
      content: "Draft body",
    });
    expect(notesApi.updateNote).not.toHaveBeenCalled();
  });

  it("recovers a local draft after reload before auto-save completes", () => {
    const view = renderNewNoteEditor();

    fireEvent.change(screen.getByPlaceholderText("Note title"), {
      target: { value: "Recovered title" },
    });
    fireEvent.change(screen.getByPlaceholderText("Start writing..."), {
      target: { value: "Recovered body" },
    });

    expect(loadDraft(draftKey())).toMatchObject({
      title: "Recovered title",
      content: "Recovered body",
    });

    view.unmount();
    renderNewNoteEditor();

    expect(screen.getByTestId("draft-recovery")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Recovered title")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Recovered body")).toBeInTheDocument();
  });
});
