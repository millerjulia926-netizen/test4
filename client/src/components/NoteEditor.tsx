import { useMemo, useState, type FormEvent } from "react";

export type NoteEditorMode = "create" | "edit";
export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type NoteEditorProps = {
  mode: NoteEditorMode;
  initialTitle?: string;
  initialContent?: string;
  saveStatus?: SaveStatus;
  onChange?: (values: { title: string; content: string }) => void;
  onSave?: (values: { title: string; content: string }) => void | Promise<void>;
  onCancel?: () => void;
};

function statusLabel(status: SaveStatus, isDirty: boolean): string | null {
  if (status === "saving") {
    return "Saving...";
  }
  if (status === "saved" && !isDirty) {
    return "All changes saved";
  }
  if (status === "error") {
    return "Save failed";
  }
  if (isDirty) {
    return "Unsaved changes";
  }
  return null;
}

export function NoteEditor({
  mode,
  initialTitle = "",
  initialContent = "",
  saveStatus = "idle",
  onChange,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(
    () => title !== initialTitle || content !== initialContent,
    [title, content, initialTitle, initialContent],
  );

  const statusText = statusLabel(saveStatus, isDirty);

  function emitChange(nextTitle: string, nextContent: string) {
    onChange?.({ title: nextTitle, content: nextContent });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!onSave) {
      return;
    }

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setError(null);
    await onSave({ title: title.trim(), content });
  }

  return (
    <form className="note-editor" onSubmit={handleSubmit} data-testid="note-editor">
      <div className="note-editor__header">
        <h1>{mode === "create" ? "New note" : "Edit note"}</h1>
        {statusText ? (
          <span
            className={`note-editor__status note-editor__status--${saveStatus === "error" ? "error" : isDirty ? "dirty" : saveStatus}`}
            data-testid="save-status"
          >
            {statusText}
          </span>
        ) : null}
      </div>

      {error ? <p className="note-editor__error">{error}</p> : null}

      <label className="note-editor__field">
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            emitChange(event.target.value, content);
          }}
          placeholder="Note title"
          aria-invalid={Boolean(error)}
        />
      </label>

      <label className="note-editor__field">
        Content
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            emitChange(title, event.target.value);
          }}
          placeholder="Start writing..."
          rows={12}
        />
      </label>

      <div className="note-editor__actions">
        {onCancel ? (
          <button type="button" onClick={onCancel} disabled={saveStatus === "saving"}>
            Cancel
          </button>
        ) : null}
        {onSave ? (
          <button type="submit" disabled={saveStatus === "saving" || !isDirty}>
            {saveStatus === "saving" ? "Saving..." : mode === "create" ? "Save now" : "Save now"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
