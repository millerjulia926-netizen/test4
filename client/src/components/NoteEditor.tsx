import { useMemo, useState, type FormEvent } from "react";

import type { Folder, Tag } from "../api/notes";
import { MarkdownContent } from "./MarkdownContent";

export type NoteEditorMode = "create" | "edit";
export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";

export type NoteEditorValues = {
  title: string;
  content: string;
  folderId: string | null;
  tagIds: string[];
};

export type NoteEditorProps = {
  mode: NoteEditorMode;
  folders?: Folder[];
  tags?: Tag[];
  initialTitle?: string;
  initialContent?: string;
  initialFolderId?: string | null;
  initialTagIds?: string[];
  saveStatus?: SaveStatus;
  onChange?: (values: NoteEditorValues) => void;
  onSave?: (values: NoteEditorValues) => void | Promise<void>;
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
  if (status === "conflict") {
    return "Updated on another device";
  }
  if (isDirty) {
    return "Unsaved changes";
  }
  return null;
}

function tagsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function NoteEditor({
  mode,
  folders = [],
  tags = [],
  initialTitle = "",
  initialContent = "",
  initialFolderId = null,
  initialTagIds = [],
  saveStatus = "idle",
  onChange,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(
    () =>
      title !== initialTitle ||
      content !== initialContent ||
      folderId !== initialFolderId ||
      !tagsEqual(tagIds, initialTagIds),
    [
      title,
      content,
      folderId,
      tagIds,
      initialTitle,
      initialContent,
      initialFolderId,
      initialTagIds,
    ],
  );

  const statusText = statusLabel(saveStatus, isDirty);

  function emitChange(
    nextTitle: string,
    nextContent: string,
    nextFolderId: string | null,
    nextTagIds: string[],
  ) {
    onChange?.({
      title: nextTitle,
      content: nextContent,
      folderId: nextFolderId,
      tagIds: nextTagIds,
    });
  }

  function toggleTag(tagId: string) {
    const nextTagIds = tagIds.includes(tagId)
      ? tagIds.filter((id) => id !== tagId)
      : [...tagIds, tagId];
    setTagIds(nextTagIds);
    emitChange(title, content, folderId, nextTagIds);
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
    await onSave({
      title: title.trim(),
      content,
      folderId,
      tagIds,
    });
  }

  return (
    <form className="note-editor" onSubmit={handleSubmit} data-testid="note-editor">
      <div className="note-editor__header">
        <h1>{mode === "create" ? "New note" : "Edit note"}</h1>
        {statusText ? (
          <span
            className={`note-editor__status note-editor__status--${saveStatus === "error" || saveStatus === "conflict" ? "error" : isDirty ? "dirty" : saveStatus}`}
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
            emitChange(event.target.value, content, folderId, tagIds);
          }}
          placeholder="Note title"
          aria-invalid={Boolean(error)}
        />
      </label>

      <label className="note-editor__field">
        Folder
        <select
          value={folderId ?? ""}
          onChange={(event) => {
            const nextFolderId = event.target.value || null;
            setFolderId(nextFolderId);
            emitChange(title, content, nextFolderId, tagIds);
          }}
        >
          <option value="">No folder</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </label>

      {tags.length > 0 ? (
        <fieldset className="note-editor__field">
          <legend>Tags</legend>
          <div className="tag-picker">
            {tags.map((tag) => (
              <label key={tag.id} className="tag-picker__item">
                <input
                  type="checkbox"
                  checked={tagIds.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                />
                {tag.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="note-editor__split">
        <label className="note-editor__field">
          Content
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              emitChange(title, event.target.value, folderId, tagIds);
            }}
            placeholder="Start writing..."
            rows={12}
          />
        </label>

        <section className="note-editor__preview" aria-label="Markdown preview">
          <h2>Preview</h2>
          <MarkdownContent content={content} className="note-editor__preview-content" />
        </section>
      </div>

      <div className="note-editor__actions">
        {onCancel ? (
          <button type="button" onClick={onCancel} disabled={saveStatus === "saving"}>
            Cancel
          </button>
        ) : null}
        {onSave ? (
          <button type="submit" disabled={saveStatus === "saving" || !isDirty}>
            {saveStatus === "saving" ? "Saving..." : "Save now"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
