import { useMemo, useState, type FormEvent } from "react";

export type NoteEditorMode = "create" | "edit";

export type NoteEditorProps = {
  mode: NoteEditorMode;
  initialTitle?: string;
  initialContent?: string;
  isSaving?: boolean;
  onSave: (values: { title: string; content: string }) => void | Promise<void>;
  onCancel?: () => void;
};

export function NoteEditor({
  mode,
  initialTitle = "",
  initialContent = "",
  isSaving = false,
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        {isDirty ? <span className="note-editor__dirty">Unsaved changes</span> : null}
      </div>

      {error ? <p className="note-editor__error">{error}</p> : null}

      <label className="note-editor__field">
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Note title"
          aria-invalid={Boolean(error)}
        />
      </label>

      <label className="note-editor__field">
        Content
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Start writing..."
          rows={12}
        />
      </label>

      <div className="note-editor__actions">
        {onCancel ? (
          <button type="button" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
        ) : null}
        <button type="submit" disabled={isSaving || !isDirty}>
          {isSaving ? "Saving..." : mode === "create" ? "Create note" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
