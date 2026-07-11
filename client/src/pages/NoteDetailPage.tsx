import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { fetchNote, type Note } from "../api/notes";
import { useAuth } from "../auth/AuthContext";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !id) {
      return;
    }

    const noteId = id;
    let cancelled = false;

    async function loadNote() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchNote(noteId);
        if (!cancelled) {
          setNote(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load note");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadNote();

    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated]);

  if (isLoading) {
    return <p>Loading note...</p>;
  }

  if (error || !note) {
    return <p className="page-error">{error ?? "Note not found"}</p>;
  }

  return (
    <article className="note-detail" data-testid="note-detail">
      <div className="note-detail__header">
        <Link to="/notes" className="note-detail__back">
          Back to notes
        </Link>
        <Link to={`/notes/${note.id}/edit`} className="note-detail__edit">
          Edit
        </Link>
      </div>
      <h1>{note.title}</h1>
      <p className="note-detail__meta">Updated {formatDate(note.updatedAt)}</p>
      <div className="note-detail__content">{note.content || "No content yet."}</div>
    </article>
  );
}
