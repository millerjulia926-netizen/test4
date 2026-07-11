import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createNote,
  fetchFolders,
  fetchNote,
  fetchTags,
  updateNote,
  type Folder,
  type Tag,
} from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NoteEditor, type NoteEditorValues, type SaveStatus } from "../components/NoteEditor";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { clearDraft, draftKey, isDraftNewerThanServer, loadDraft, saveDraft } from "../lib/drafts";

const AUTO_SAVE_DELAY_MS = 800;

type EditorDraft = NoteEditorValues & { updatedAt?: string };

export function NoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const mode = id ? "edit" : "create";

  const [noteId, setNoteId] = useState<string | undefined>(id);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [initialValues, setInitialValues] = useState<NoteEditorValues>({
    title: "",
    content: "",
    folderId: null,
    tagIds: [],
  });
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [draftRecovered, setDraftRecovered] = useState(false);

  const latestValuesRef = useRef<NoteEditorValues>(initialValues);
  const saveVersionRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void Promise.all([fetchFolders(), fetchTags()]).then(([nextFolders, nextTags]) => {
      setFolders(nextFolders);
      setTags(nextTags);
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (mode === "create") {
      const draft = loadDraft(draftKey()) as EditorDraft | null;
      if (draft) {
        const values = {
          title: draft.title,
          content: draft.content,
          folderId: draft.folderId ?? null,
          tagIds: draft.tagIds ?? [],
        };
        setInitialValues(values);
        latestValuesRef.current = values;
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

        const draft = loadDraft(draftKey(noteIdValue)) as EditorDraft | null;
        const useDraft =
          draft &&
          (draft.title !== note.title ||
            draft.content !== note.content ||
            (draft.folderId ?? null) !== note.folderId ||
            isDraftNewerThanServer(
              { ...draft, updatedAt: draft.updatedAt ?? new Date(0).toISOString() },
              note.updatedAt,
            ));

        const values = useDraft
          ? {
              title: draft.title,
              content: draft.content,
              folderId: draft.folderId ?? null,
              tagIds: draft.tagIds ?? note.tags.map((tag) => tag.id),
            }
          : {
              title: note.title,
              content: note.content,
              folderId: note.folderId,
              tagIds: note.tags.map((tag) => tag.id),
            };

        setInitialValues(values);
        latestValuesRef.current = values;
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
    (values: NoteEditorValues) => {
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
      const payload = {
        title: values.title.trim(),
        content: values.content,
        folderId: values.folderId,
        tagIds: values.tagIds,
      };

      const savedNote = noteId ? await updateNote(noteId, payload) : await createNote(payload);

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

      const nextValues = {
        title: savedNote.title,
        content: savedNote.content,
        folderId: savedNote.folderId,
        tagIds: savedNote.tags.map((tag) => tag.id),
      };

      setInitialValues(nextValues);
      latestValuesRef.current = nextValues;
      setSaveStatus("saved");
    } catch {
      if (saveVersion === saveVersionRef.current) {
        setSaveStatus("error");
      }
    }
  }, [navigate, noteId]);

  const debouncedAutoSave = useDebouncedCallback(runAutoSave, AUTO_SAVE_DELAY_MS);

  function handleChange(values: NoteEditorValues) {
    persistDraft(values);
    debouncedAutoSave();
  }

  async function handleManualSave(values: NoteEditorValues) {
    latestValuesRef.current = values;
    await runAutoSave();
  }

  if (isLoading) {
    return <LoadingState message="Loading note..." />;
  }

  if (loadError) {
    return <ErrorState message={loadError} actionLabel="Back to notes" actionTo="/notes" />;
  }

  return (
    <>
      {draftRecovered ? (
        <p className="note-editor__recovery" data-testid="draft-recovery">
          Recovered unsaved draft from your last session.
        </p>
      ) : null}
      <NoteEditor
        key={`${mode}-${noteId ?? "new"}-${initialValues.title}`}
        mode={noteId ? "edit" : "create"}
        folders={folders}
        tags={tags}
        initialTitle={initialValues.title}
        initialContent={initialValues.content}
        initialFolderId={initialValues.folderId}
        initialTagIds={initialValues.tagIds}
        saveStatus={saveStatus}
        onChange={handleChange}
        onSave={handleManualSave}
        onCancel={() => navigate(-1)}
      />
    </>
  );
}
