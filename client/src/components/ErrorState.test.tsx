import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an error message", () => {
    render(<ErrorState message="Something went wrong" />);

    expect(screen.getByTestId("error-state")).toHaveTextContent("Something went wrong");
  });

  it("renders a navigation action", () => {
    render(
      <MemoryRouter>
        <ErrorState message="Note not found" actionLabel="Back to notes" actionTo="/notes" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Back to notes" })).toHaveAttribute("href", "/notes");
  });

  it("renders a button action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(<ErrorState message="Failed to load" actionLabel="Try again" onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onAction).toHaveBeenCalledOnce();
  });
});
