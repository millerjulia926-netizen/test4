import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  createFolder,
  createTag,
  deleteFolder,
  deleteTag,
  fetchFolders,
  fetchTags,
  type Folder,
  type Tag,
} from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useSyncOnFocus } from "../hooks/useSyncOnFocus";

export function OrganizePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [folderName, setFolderName] = useState("");
  const [tagName, setTagName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const backgroundSyncRef = useRef(false);

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

    async function loadOrganizeData() {
      const background = backgroundSyncRef.current;
      backgroundSyncRef.current = false;

      if (!background) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const [nextFolders, nextTags] = await Promise.all([fetchFolders(), fetchTags()]);
        if (!cancelled) {
          setFolders(nextFolders);
          setTags(nextTags);
        }
      } catch (loadFailure) {
        if (!cancelled) {
          setLoadError(
            loadFailure instanceof Error ? loadFailure.message : "Failed to load folders and tags",
          );
        }
      } finally {
        if (!cancelled && !background) {
          setIsLoading(false);
        }
      }
    }

    void loadOrganizeData();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, reloadKey]);

  const syncOrganizeData = useCallback(() => {
    backgroundSyncRef.current = true;
    setReloadKey((value) => value + 1);
  }, []);

  useSyncOnFocus(syncOrganizeData, isAuthenticated);

  async function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = folderName.trim();
    if (!trimmedName) {
      setError("Folder name is required");
      return;
    }

    try {
      const folder = await createFolder({ name: trimmedName });
      setFolders((current) => [...current, folder].sort((a, b) => a.name.localeCompare(b.name)));
      setFolderName("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create folder");
    }
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = tagName.trim();
    if (!trimmedName) {
      setError("Tag name is required");
      return;
    }

    try {
      const tag = await createTag(trimmedName);
      setTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setTagName("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create tag");
    }
  }

  async function handleDeleteFolder(folderId: string) {
    setError(null);

    try {
      await deleteFolder(folderId);
      setFolders((current) => current.filter((item) => item.id !== folderId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete folder");
    }
  }

  async function handleDeleteTag(tagId: string) {
    setError(null);

    try {
      await deleteTag(tagId);
      setTags((current) => current.filter((item) => item.id !== tagId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete tag");
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading folders and tags..." />;
  }

  if (loadError) {
    return (
      <ErrorState
        message={loadError}
        actionLabel="Try again"
        onAction={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  return (
    <section className="organize-page" data-testid="organize-page">
      <h1>Organize</h1>
      {error ? <p className="page-error">{error}</p> : null}

      <div className="organize-page__grid">
        <div>
          <h2>Folders</h2>
          <form onSubmit={handleCreateFolder} className="organize-form">
            <input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="New folder name"
            />
            <button type="submit" disabled={!folderName.trim()}>
              Add folder
            </button>
          </form>
          {folders.length === 0 ? (
            <p className="organize-empty">No folders yet. Create one above.</p>
          ) : (
            <ul className="organize-list">
              {folders.map((folder) => (
                <li key={folder.id}>
                  <span>{folder.name}</span>
                  <button type="button" onClick={() => void handleDeleteFolder(folder.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2>Tags</h2>
          <form onSubmit={handleCreateTag} className="organize-form">
            <input
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              placeholder="New tag name"
            />
            <button type="submit" disabled={!tagName.trim()}>
              Add tag
            </button>
          </form>
          {tags.length === 0 ? (
            <p className="organize-empty">No tags yet. Create one above.</p>
          ) : (
            <ul className="organize-list">
              {tags.map((tag) => (
                <li key={tag.id}>
                  <span>{tag.name}</span>
                  <button type="button" onClick={() => void handleDeleteTag(tag.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
