const sentEmails: Array<{ to: string; subject: string; body: string }> = [];

export async function sendConfirmationEmail(to: string): Promise<void> {
  const message = {
    to,
    subject: "Confirm your Notes account",
    body: `Welcome! Please confirm your account for ${to}.`,
  };

  sentEmails.push(message);

  if (process.env.NODE_ENV !== "test") {
    console.info(`[email] ${message.subject} -> ${to}`);
  }
}

export function getSentEmails(): Array<{ to: string; subject: string; body: string }> {
  return [...sentEmails];
}

export function clearSentEmails(): void {
  sentEmails.length = 0;
}
