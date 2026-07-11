import { getAccessToken } from "../api/notes";

export async function downloadNoteMarkdown(noteId: string, title: string): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`/notes/${noteId}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to export note");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.replace(/[^\w.-]+/g, "_") || "note"}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}
