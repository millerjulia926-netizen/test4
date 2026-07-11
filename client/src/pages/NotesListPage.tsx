import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  fetchFolders,
  fetchNotes,
  fetchTags,
  type Folder,
  type Note,
  type Tag,
} from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { NotesList } from "../components/NotesList";

export function NotesListPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const folderId = searchParams.get("folderId") ?? "";
  const tagId = searchParams.get("tagId") ?? "";

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

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [notesData, foldersData, tagsData] = await Promise.all([
          fetchNotes({
            folderId: folderId || undefined,
            tagId: tagId || undefined,
          }),
          fetchFolders(),
          fetchTags(),
        ]);

        if (!cancelled) {
          setNotes(notesData);
          setFolders(foldersData);
          setTags(tagsData);
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

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [folderId, isAuthenticated, tagId]);

  function updateFilter(key: "folderId" | "tagId", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  if (isLoading) {
    return <p>Loading notes...</p>;
  }

  if (error) {
    return <p className="page-error">{error}</p>;
  }

  return (
    <NotesList
      notes={notes}
      folders={folders}
      tags={tags}
      selectedFolderId={folderId}
      selectedTagId={tagId}
      onFolderFilterChange={(value) => updateFilter("folderId", value)}
      onTagFilterChange={(value) => updateFilter("tagId", value)}
    />
  );
}
