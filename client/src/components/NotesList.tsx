import { Link } from "react-router-dom";

import type { Folder, Note, Tag } from "../api/notes";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function preview(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return "No content yet";
  }
  return trimmed.length > 120 ? `${trimmed.slice(0, 120)}...` : trimmed;
}

export type NotesListProps = {
  notes: Note[];
  folders?: Folder[];
  tags?: Tag[];
  selectedFolderId?: string;
  selectedTagId?: string;
  searchQuery?: string;
  archived?: boolean;
  onFolderFilterChange?: (folderId: string) => void;
  onTagFilterChange?: (tagId: string) => void;
  onSearchChange?: (query: string) => void;
  onClearFilters?: () => void;
};

export function NotesList({
  notes,
  folders = [],
  tags = [],
  selectedFolderId = "",
  selectedTagId = "",
  searchQuery = "",
  archived = false,
  onFolderFilterChange,
  onTagFilterChange,
  onSearchChange,
  onClearFilters,
}: NotesListProps) {
  const folderName = folders.find((folder) => folder.id === selectedFolderId)?.name;
  const tagName = tags.find((tag) => tag.id === selectedTagId)?.name;
  const hasActiveFilters = Boolean(folderName || tagName || searchQuery.trim());
  const heading = archived ? "Archived notes" : "Your notes";

  if (notes.length === 0) {
    return (
      <section className="notes-list notes-list--empty" data-testid="notes-list">
        <h1>{heading}</h1>
        {onSearchChange || onFolderFilterChange || onTagFilterChange ? (
          <div className="notes-filters">
            {onSearchChange ? (
              <label className="notes-search">
                Search
                <input
                  type="search"
                  value={searchQuery}
                  placeholder="Search titles and content"
                  onChange={(event) => onSearchChange(event.target.value)}
                />
              </label>
            ) : null}
            {onFolderFilterChange ? (
              <label>
                Folder
                <select
                  value={selectedFolderId}
                  onChange={(event) => onFolderFilterChange(event.target.value)}
                >
                  <option value="">All folders</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {onTagFilterChange ? (
              <label>
                Tag
                <select
                  value={selectedTagId}
                  onChange={(event) => onTagFilterChange(event.target.value)}
                >
                  <option value="">All tags</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
        {hasActiveFilters ? (
          <>
            <p>No notes match the current filters.</p>
            {onClearFilters ? (
              <button type="button" className="notes-list__cta" onClick={onClearFilters}>
                Clear filters
              </button>
            ) : null}
          </>
        ) : archived ? (
          <p>You do not have any archived notes.</p>
        ) : (
          <p>You do not have any notes yet.</p>
        )}
        {!archived && !hasActiveFilters ? (
          <Link to="/notes/new" className="notes-list__cta">
            Create your first note
          </Link>
        ) : null}
        {!archived && !hasActiveFilters ? (
          <Link to="/notes/archived" className="notes-list__secondary-link">
            View archived notes
          </Link>
        ) : null}
        {archived && !hasActiveFilters ? (
          <Link to="/notes" className="notes-list__cta">
            Back to notes
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="notes-list" data-testid="notes-list">
      <div className="notes-list__header">
        <h1>{heading}</h1>
        {archived ? <Link to="/notes">Back to notes</Link> : <Link to="/notes/new">New note</Link>}
      </div>

      {onFolderFilterChange || onTagFilterChange || onSearchChange ? (
        <div className="notes-filters">
          {onSearchChange ? (
            <label className="notes-search">
              Search
              <input
                type="search"
                value={searchQuery}
                placeholder="Search titles and content"
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </label>
          ) : null}
          {onFolderFilterChange ? (
            <label>
              Folder
              <select
                value={selectedFolderId}
                onChange={(event) => onFolderFilterChange(event.target.value)}
              >
                <option value="">All folders</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {onTagFilterChange ? (
            <label>
              Tag
              <select
                value={selectedTagId}
                onChange={(event) => onTagFilterChange(event.target.value)}
              >
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      <ul className="notes-list__items">
        {notes.map((note) => (
          <li key={note.id}>
            <Link to={`/notes/${note.id}`} className="notes-list__item">
              <span className="notes-list__title">
                {note.isPinned ? <span className="notes-list__pin">Pinned</span> : null}
                {note.title}
              </span>
              <span className="notes-list__preview">{preview(note.content)}</span>
              {note.tags.length > 0 ? (
                <span className="notes-list__tags">
                  {note.tags.map((tag) => (
                    <span key={tag.id} className="tag-chip">
                      {tag.name}
                    </span>
                  ))}
                </span>
              ) : null}
              <span className="notes-list__meta">Updated {formatDate(note.updatedAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
