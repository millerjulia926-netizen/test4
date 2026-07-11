import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  fetchFolders,
  fetchNote,
  updateNote,
  createNoteShare,
  revokeNoteShare,
  type Folder,
  type Note,
} from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { MarkdownContent } from "../components/MarkdownContent";
import { useSyncOnFocus } from "../hooks/useSyncOnFocus";
import { downloadNoteMarkdown } from "../lib/exportNote";

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
  const [reloadKey, setReloadKey] = useState(0);
  const [shareInfo, setShareInfo] = useState<{
    shareId: string;
    url: string;
    expiresAt: string;
  } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
  }, [id, isAuthenticated, reloadKey]);

  const syncNote = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  useSyncOnFocus(syncNote, isAuthenticated && Boolean(id));

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

  async function handleExport() {
    if (!note) {
      return;
    }

    setActionMessage(null);
    try {
      await downloadNoteMarkdown(note.id, note.title);
      setActionMessage("Note exported as Markdown");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Failed to export note");
    }
  }

  async function handleShare() {
    if (!note) {
      return;
    }

    setActionMessage(null);
    setIsUpdating(true);

    try {
      const share = await createNoteShare(note.id);
      const url = `${window.location.origin}/shared/${share.token}`;
      await navigator.clipboard.writeText(url);
      setShareInfo({ shareId: share.shareId, url, expiresAt: share.expiresAt });
      setActionMessage("Share link copied to clipboard");
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "Failed to create share link");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRevokeShare() {
    if (!note || !shareInfo) {
      return;
    }

    setIsUpdating(true);
    setActionMessage(null);

    try {
      await revokeNoteShare(note.id, shareInfo.shareId);
      setShareInfo(null);
      setActionMessage("Share link revoked");
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Failed to revoke share link");
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
    return <LoadingState message="Loading note..." />;
  }

  if (error || !note) {
    return (
      <ErrorState
        message={error ?? "Note not found"}
        actionLabel="Back to notes"
        actionTo="/notes"
      />
    );
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
          <button type="button" disabled={isUpdating} onClick={() => void handleExport()}>
            Export
          </button>
          <button type="button" disabled={isUpdating} onClick={() => void handleShare()}>
            Share
          </button>
          <Link to={`/notes/${note.id}/edit`} className="note-detail__edit">
            Edit
          </Link>
          <button type="button" disabled={isUpdating} onClick={() => void handleArchiveToggle()}>
            {note.archivedAt ? "Restore" : "Archive"}
          </button>
        </div>
      </div>
      {actionMessage ? <p className="note-detail__message">{actionMessage}</p> : null}
      {shareInfo ? (
        <div className="note-detail__share">
          <p className="note-detail__meta">Share link expires {formatDate(shareInfo.expiresAt)}</p>
          <button type="button" disabled={isUpdating} onClick={() => void handleRevokeShare()}>
            Revoke share link
          </button>
        </div>
      ) : null}
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
      <MarkdownContent content={note.content} className="note-detail__content" />
    </article>
  );
}
