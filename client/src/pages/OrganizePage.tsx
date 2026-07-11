import { FormEvent, useEffect, useState } from "react";
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

export function OrganizePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [folderName, setFolderName] = useState("");
  const [tagName, setTagName] = useState("");
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

    void Promise.all([fetchFolders(), fetchTags()]).then(([nextFolders, nextTags]) => {
      setFolders(nextFolders);
      setTags(nextTags);
    });
  }, [isAuthenticated]);

  async function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const folder = await createFolder({ name: folderName });
      setFolders((current) => [...current, folder].sort((a, b) => a.name.localeCompare(b.name)));
      setFolderName("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create folder");
    }
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const tag = await createTag(tagName);
      setTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setTagName("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create tag");
    }
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
              required
            />
            <button type="submit">Add folder</button>
          </form>
          <ul className="organize-list">
            {folders.map((folder) => (
              <li key={folder.id}>
                <span>{folder.name}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteFolder(folder.id);
                    setFolders((current) => current.filter((item) => item.id !== folder.id));
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2>Tags</h2>
          <form onSubmit={handleCreateTag} className="organize-form">
            <input
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              placeholder="New tag name"
              required
            />
            <button type="submit">Add tag</button>
          </form>
          <ul className="organize-list">
            {tags.map((tag) => (
              <li key={tag.id}>
                <span>{tag.name}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteTag(tag.id);
                    setTags((current) => current.filter((item) => item.id !== tag.id));
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
