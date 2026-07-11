export type ExportableNote = {
  title: string;
  content: string;
  tags?: Array<{ name: string }>;
};

export function serializeNoteToMarkdown(note: ExportableNote): string {
  const lines = [`# ${note.title}`, ""];

  if (note.tags && note.tags.length > 0) {
    lines.push(`Tags: ${note.tags.map((tag) => tag.name).join(", ")}`, "");
  }

  lines.push(note.content.trim());
  return `${lines.join("\n").trim()}\n`;
}
