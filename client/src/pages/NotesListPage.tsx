import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchNotes, type Note } from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { NotesList } from "../components/NotesList";

export function NotesListPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function loadNotes() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchNotes();
        if (!cancelled) {
          setNotes(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load notes");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return <p>Loading notes...</p>;
  }

  if (error) {
    return <p className="page-error">{error}</p>;
  }

  return <NotesList notes={notes} />;
}
