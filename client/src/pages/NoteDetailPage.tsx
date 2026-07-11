import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { fetchFolders, fetchNote, updateNote, type Folder, type Note } from "../api/notes";
import { useAuth } from "../auth/AuthContext";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
        const [data, folderData] = await Promise.all([fetchNote(noteId), fetchFolders()]);
        if (!cancelled) {
          setNote(data);
          setFolders(folderData);
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

  async function handlePinToggle() {
    if (!note) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const updated = await updateNote(note.id, { isPinned: !note.isPinned });
      setNote(updated);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update note");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleArchiveToggle() {
    if (!note) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      if (note.archivedAt) {
        const updated = await updateNote(note.id, { archived: false });
        setNote(updated);
      } else {
        await updateNote(note.id, { archived: true });
        navigate("/notes");
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update note");
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return <p>Loading note...</p>;
  }

  if (error || !note) {
    return <p className="page-error">{error ?? "Note not found"}</p>;
  }

  return (
    <article className="note-detail" data-testid="note-detail">
      <div className="note-detail__header">
        <Link to={note.archivedAt ? "/notes/archived" : "/notes"} className="note-detail__back">
          {note.archivedAt ? "Back to archived" : "Back to notes"}
        </Link>
        <div className="note-detail__actions">
          {!note.archivedAt ? (
            <button type="button" disabled={isUpdating} onClick={() => void handlePinToggle()}>
              {note.isPinned ? "Unpin" : "Pin"}
            </button>
          ) : null}
          <Link to={`/notes/${note.id}/edit`} className="note-detail__edit">
            Edit
          </Link>
          <button type="button" disabled={isUpdating} onClick={() => void handleArchiveToggle()}>
            {note.archivedAt ? "Restore" : "Archive"}
          </button>
        </div>
      </div>
      <h1>
        {note.isPinned ? <span className="notes-list__pin">Pinned</span> : null}
        {note.title}
      </h1>
      <p className="note-detail__meta">Updated {formatDate(note.updatedAt)}</p>
      {note.archivedAt ? (
        <p className="note-detail__meta">Archived {formatDate(note.archivedAt)}</p>
      ) : null}
      {note.folderId ? (
        <p className="note-detail__meta">
          Folder: {folders.find((folder) => folder.id === note.folderId)?.name ?? "Unknown"}
        </p>
      ) : null}
      {note.tags.length > 0 ? (
        <div className="note-detail__tags">
          {note.tags.map((tag) => (
            <span key={tag.id} className="tag-chip">
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="note-detail__content">{note.content || "No content yet."}</div>
    </article>
  );
}
