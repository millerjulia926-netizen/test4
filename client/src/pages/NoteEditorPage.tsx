import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { createNote, fetchNote, updateNote } from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { NoteEditor } from "../components/NoteEditor";

export function NoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const mode = id ? "edit" : "create";

  const [initialTitle, setInitialTitle] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (mode !== "edit" || !id) {
      return;
    }

    const noteId = id;
    let cancelled = false;

    async function loadNote() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const note = await fetchNote(noteId);
        if (!cancelled) {
          setInitialTitle(note.title);
          setInitialContent(note.content);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load note");
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
  }, [id, mode]);

  async function handleSave(values: { title: string; content: string }) {
    setIsSaving(true);

    try {
      const note = mode === "create" ? await createNote(values) : await updateNote(id!, values);

      navigate(`/notes/${note.id}/edit`, { replace: true });
      setInitialTitle(note.title);
      setInitialContent(note.content);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p>Loading note...</p>;
  }

  if (loadError) {
    return <p className="note-editor__error">{loadError}</p>;
  }

  return (
    <NoteEditor
      key={`${mode}-${id ?? "new"}-${initialTitle}`}
      mode={mode}
      initialTitle={initialTitle}
      initialContent={initialContent}
      isSaving={isSaving}
      onSave={handleSave}
      onCancel={() => navigate(-1)}
    />
  );
}
