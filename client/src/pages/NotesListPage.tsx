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
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NotesList } from "../components/NotesList";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";

const SEARCH_DEBOUNCE_MS = 300;

type NotesListPageProps = {
  archived?: boolean;
};

export function NotesListPage({ archived = false }: NotesListPageProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const folderId = searchParams.get("folderId") ?? "";
  const tagId = searchParams.get("tagId") ?? "";
  const searchQuery = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

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
            q: searchQuery || undefined,
            archived,
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
  }, [archived, folderId, isAuthenticated, reloadKey, searchQuery, tagId]);

  const debouncedUpdateSearch = useDebouncedCallback((value: string) => {
    const next = new URLSearchParams(searchParams);
    const trimmed = value.trim();
    if (trimmed) {
      next.set("q", trimmed);
    } else {
      next.delete("q");
    }
    setSearchParams(next);
  }, SEARCH_DEBOUNCE_MS);

  function updateFilter(key: "folderId" | "tagId", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    debouncedUpdateSearch(value);
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams());
    setSearchInput("");
  }

  if (isLoading) {
    return <LoadingState message={archived ? "Loading archived notes..." : "Loading notes..."} />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        actionLabel="Try again"
        onAction={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  return (
    <NotesList
      notes={notes}
      folders={folders}
      tags={tags}
      selectedFolderId={folderId}
      selectedTagId={tagId}
      searchQuery={searchInput}
      archived={archived}
      onFolderFilterChange={(value) => updateFilter("folderId", value)}
      onTagFilterChange={(value) => updateFilter("tagId", value)}
      onSearchChange={handleSearchChange}
      onClearFilters={clearFilters}
    />
  );
}
