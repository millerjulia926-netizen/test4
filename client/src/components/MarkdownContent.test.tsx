import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MarkdownContent } from "./MarkdownContent";

describe("MarkdownContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an empty fallback when content is blank", () => {
    render(<MarkdownContent content="   " emptyFallback="Nothing here" />);

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByTestId("markdown-content")).not.toBeInTheDocument();
  });

  it("renders markdown headings and emphasis", () => {
    render(<MarkdownContent content={"# Hello\n\nThis is **bold** text."} />);

    expect(screen.getByRole("heading", { level: 1, name: "Hello" })).toBeInTheDocument();
    expect(screen.getByText("bold")).toHaveProperty("tagName", "STRONG");
  });

  it("renders markdown lists", () => {
    render(<MarkdownContent content={"- One\n- Two"} />);

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("does not render raw HTML from markdown input", () => {
    render(<MarkdownContent content={'<script>alert("xss")</script>'} />);

    expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument();
  });
});
