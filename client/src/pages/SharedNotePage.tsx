import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchSharedNote } from "../api/notes";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { MarkdownContent } from "../components/MarkdownContent";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function SharedNotePage() {
  const { token } = useParams();
  const [note, setNote] = useState<{ title: string; content: string; updatedAt: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Share link not found");
      setIsLoading(false);
      return;
    }

    const shareToken = token;
    let cancelled = false;

    async function loadSharedNote() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchSharedNote(shareToken);
        if (!cancelled) {
          setNote(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load shared note");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSharedNote();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (isLoading) {
    return <LoadingState message="Loading shared note..." />;
  }

  if (error || !note) {
    return (
      <main className="app-main">
        <ErrorState message={error ?? "Share link not found"} actionLabel="Go home" actionTo="/" />
      </main>
    );
  }

  return (
    <main className="app-main">
      <article className="note-detail shared-note" data-testid="shared-note">
        <div className="note-detail__header">
          <Link to="/" className="note-detail__back">
            Notes
          </Link>
          <span className="shared-note__badge">Shared view</span>
        </div>
        <h1>{note.title}</h1>
        <p className="note-detail__meta">Updated {formatDate(note.updatedAt)}</p>
        <MarkdownContent content={note.content} className="note-detail__content" />
      </article>
    </main>
  );
}
