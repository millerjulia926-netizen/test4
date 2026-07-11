export type TagSummary = {
  id: string;
  name: string;
};

export type Note = {
  id: string;
  userId: string;
  folderId: string | null;
  title: string;
  content: string;
  isPinned: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: TagSummary[];
};

export type Folder = {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Tag = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

const TOKEN_KEY = "notes_access_token";
const REFRESH_KEY = "notes_refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, { ...init, headers });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(email: string, password: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchNotes(filters?: {
  folderId?: string;
  tagId?: string;
  q?: string;
  archived?: boolean;
}): Promise<Note[]> {
  const params = new URLSearchParams();
  if (filters?.folderId) {
    params.set("folderId", filters.folderId);
  }
  if (filters?.tagId) {
    params.set("tagId", filters.tagId);
  }
  if (filters?.q) {
    params.set("q", filters.q);
  }
  if (filters?.archived) {
    params.set("archived", "true");
  }

  const query = params.toString();
  return apiFetch<Note[]>(`/notes${query ? `?${query}` : ""}`);
}

export async function fetchNote(id: string): Promise<Note> {
  return apiFetch<Note>(`/notes/${id}`);
}

export async function createNote(input: {
  title: string;
  content: string;
  folderId?: string | null;
  tagIds?: string[];
}): Promise<Note> {
  return apiFetch<Note>("/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateNote(
  id: string,
  input: {
    title?: string;
    content?: string;
    folderId?: string | null;
    tagIds?: string[];
    isPinned?: boolean;
    archived?: boolean;
  },
): Promise<Note> {
  return apiFetch<Note>(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function fetchFolders(): Promise<Folder[]> {
  return apiFetch<Folder[]>("/folders");
}

export async function createFolder(input: {
  name: string;
  parentId?: string | null;
}): Promise<Folder> {
  return apiFetch<Folder>("/folders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteFolder(id: string): Promise<void> {
  return apiFetch<void>(`/folders/${id}`, { method: "DELETE" });
}

export async function fetchTags(): Promise<Tag[]> {
  return apiFetch<Tag[]>("/tags");
}

export async function createTag(name: string): Promise<Tag> {
  return apiFetch<Tag>("/tags", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteTag(id: string): Promise<void> {
  return apiFetch<void>(`/tags/${id}`, { method: "DELETE" });
}
