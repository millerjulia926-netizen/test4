import { Link } from "react-router-dom";

import type { Note } from "../api/notes";

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
};

export function NotesList({ notes }: NotesListProps) {
  if (notes.length === 0) {
    return (
      <section className="notes-list notes-list--empty" data-testid="notes-list">
        <h1>Your notes</h1>
        <p>You do not have any notes yet.</p>
        <Link to="/notes/new" className="notes-list__cta">
          Create your first note
        </Link>
      </section>
    );
  }

  return (
    <section className="notes-list" data-testid="notes-list">
      <div className="notes-list__header">
        <h1>Your notes</h1>
        <Link to="/notes/new">New note</Link>
      </div>
      <ul className="notes-list__items">
        {notes.map((note) => (
          <li key={note.id}>
            <Link to={`/notes/${note.id}`} className="notes-list__item">
              <span className="notes-list__title">{note.title}</span>
              <span className="notes-list__preview">{preview(note.content)}</span>
              <span className="notes-list__meta">Updated {formatDate(note.updatedAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
