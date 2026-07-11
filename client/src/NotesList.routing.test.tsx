import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { NotesList } from "./components/NotesList";
import { NoteDetailPage } from "./pages/NoteDetailPage";

const sampleNotes = [
  {
    id: "note-1",
    userId: "user-1",
    folderId: null,
    title: "Meeting notes",
    content: "Discuss roadmap",
    isPinned: false,
    archivedAt: null,
    tags: [],
    createdAt: "2026-07-11T10:00:00.000Z",
    updatedAt: "2026-07-11T12:00:00.000Z",
  },
];

vi.mock("./api/notes", async () => {
  const actual = await vi.importActual<typeof import("./api/notes")>("./api/notes");
  return {
    ...actual,
    getAccessToken: () => "test-token",
    fetchNote: vi.fn(async () => sampleNotes[0]),
    fetchNotes: vi.fn(),
    fetchFolders: vi.fn(async () => []),
    fetchTags: vi.fn(async () => []),
    login: vi.fn(),
    signup: vi.fn(),
  };
});

describe("notes list routing", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("navigates from a list item into the detail view", async () => {
    const user = userEvent.setup();
    localStorage.setItem("notes_access_token", "test-token");

    render(
      <MemoryRouter initialEntries={["/notes"]}>
        <AuthProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="notes" element={<NotesList notes={sampleNotes} />} />
              <Route path="notes/:id" element={<NoteDetailPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: /Discuss roadmap/i }));

    expect(await screen.findByTestId("note-detail")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Meeting notes" })).toBeInTheDocument();
    expect(screen.getByText("Discuss roadmap")).toBeInTheDocument();
  });
});
