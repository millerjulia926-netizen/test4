import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../auth/AuthContext";
import { OrganizePage } from "./OrganizePage";

vi.mock("../api/notes", () => ({
  getAccessToken: () => "test-token",
  restoreSession: vi.fn(async () => true),
  fetchFolders: vi.fn(async () => []),
  fetchTags: vi.fn(async () => []),
  createFolder: vi.fn(),
  createTag: vi.fn(),
  deleteFolder: vi.fn(),
  deleteTag: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
}));

describe("OrganizePage", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows empty states when there are no folders or tags", async () => {
    localStorage.setItem("notes_access_token", "test-token");

    render(
      <MemoryRouter>
        <AuthProvider>
          <OrganizePage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("No folders yet. Create one above.")).toBeInTheDocument();
    expect(screen.getByText("No tags yet. Create one above.")).toBeInTheDocument();
  });

  it("disables create buttons until names are entered", async () => {
    localStorage.setItem("notes_access_token", "test-token");

    render(
      <MemoryRouter>
        <AuthProvider>
          <OrganizePage />
        </AuthProvider>
      </MemoryRouter>,
    );

    await screen.findByText("No folders yet. Create one above.");

    expect(screen.getByRole("button", { name: "Add folder" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add tag" })).toBeDisabled();
  });

  it("shows a retry action when loading fails", async () => {
    const user = userEvent.setup();
    const { fetchFolders } = await import("../api/notes");

    vi.mocked(fetchFolders)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce([]);

    localStorage.setItem("notes_access_token", "test-token");

    render(
      <MemoryRouter>
        <AuthProvider>
          <OrganizePage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("error-state")).toHaveTextContent("Network error");

    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByText("No folders yet. Create one above.")).toBeInTheDocument();
    });
  });
});
