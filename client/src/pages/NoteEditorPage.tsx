import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { createNote, fetchNote, updateNote } from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { NoteEditor, type SaveStatus } from "../components/NoteEditor";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { clearDraft, draftKey, isDraftNewerThanServer, loadDraft, saveDraft } from "../lib/drafts";

const AUTO_SAVE_DELAY_MS = 800;

export function NoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const mode = id ? "edit" : "create";

  const [noteId, setNoteId] = useState<string | undefined>(id);
  const [initialTitle, setInitialTitle] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [draftRecovered, setDraftRecovered] = useState(false);

  const latestValuesRef = useRef({ title: "", content: "" });
  const saveVersionRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (mode === "create") {
      const draft = loadDraft(draftKey());
      if (draft) {
        setInitialTitle(draft.title);
        setInitialContent(draft.content);
        latestValuesRef.current = { title: draft.title, content: draft.content };
        setDraftRecovered(true);
        setSaveStatus("dirty");
      }
      return;
    }

    if (!id) {
      return;
    }

    const noteIdValue = id;
    let cancelled = false;

    async function loadNote() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const note = await fetchNote(noteIdValue);
        if (cancelled) {
          return;
        }

        const draft = loadDraft(draftKey(noteIdValue));
        const useDraft =
          draft &&
          (draft.title !== note.title ||
            draft.content !== note.content ||
            isDraftNewerThanServer(draft, note.updatedAt));

        const title = useDraft ? draft.title : note.title;
        const content = useDraft ? draft.content : note.content;

        setInitialTitle(title);
        setInitialContent(content);
        latestValuesRef.current = { title, content };
        setDraftRecovered(Boolean(useDraft));
        setSaveStatus(useDraft ? "dirty" : "saved");
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

  const persistDraft = useCallback(
    (values: { title: string; content: string }) => {
      latestValuesRef.current = values;
      saveDraft(draftKey(noteId), values);
      setSaveStatus("dirty");
    },
    [noteId],
  );

  const runAutoSave = useCallback(async () => {
    const values = latestValuesRef.current;
    if (!values.title.trim()) {
      return;
    }

    const saveVersion = ++saveVersionRef.current;
    setSaveStatus("saving");

    try {
      const savedNote = noteId
        ? await updateNote(noteId, {
            title: values.title.trim(),
            content: values.content,
          })
        : await createNote({
            title: values.title.trim(),
            content: values.content,
          });

      if (saveVersion !== saveVersionRef.current) {
        return;
      }

      if (!noteId) {
        setNoteId(savedNote.id);
        clearDraft(draftKey());
        navigate(`/notes/${savedNote.id}/edit`, { replace: true });
      } else {
        clearDraft(draftKey(noteId));
      }

      setInitialTitle(savedNote.title);
      setInitialContent(savedNote.content);
      latestValuesRef.current = {
        title: savedNote.title,
        content: savedNote.content,
      };
      setSaveStatus("saved");
    } catch {
      if (saveVersion === saveVersionRef.current) {
        setSaveStatus("error");
      }
    }
  }, [navigate, noteId]);

  const debouncedAutoSave = useDebouncedCallback(runAutoSave, AUTO_SAVE_DELAY_MS);

  function handleChange(values: { title: string; content: string }) {
    persistDraft(values);
    debouncedAutoSave();
  }

  async function handleManualSave(values: { title: string; content: string }) {
    latestValuesRef.current = values;
    await runAutoSave();
  }

  if (isLoading) {
    return <p>Loading note...</p>;
  }

  if (loadError) {
    return <p className="note-editor__error">{loadError}</p>;
  }

  return (
    <>
      {draftRecovered ? (
        <p className="note-editor__recovery" data-testid="draft-recovery">
          Recovered unsaved draft from your last session.
        </p>
      ) : null}
      <NoteEditor
        key={`${mode}-${noteId ?? "new"}-${initialTitle}`}
        mode={noteId ? "edit" : "create"}
        initialTitle={initialTitle}
        initialContent={initialContent}
        saveStatus={saveStatus}
        onChange={handleChange}
        onSave={handleManualSave}
        onCancel={() => navigate(-1)}
      />
    </>
  );
}
