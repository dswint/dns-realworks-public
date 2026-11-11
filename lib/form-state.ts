export type FormState = {
  error: string | null;
  saved?: boolean;
  at?: number;
  message?: string | null;
};

export const NOTICE_MESSAGES = {
  created: "Created.",
  deleted: "Deleted.",
  saved: "Saved.",
  uploaded: "Uploaded.",
  welcome: "Signed in.",
  sent: "If we know that email, a link is on its way.",
  booked: "You're booked.",
} as const;

export type Notice = keyof typeof NOTICE_MESSAGES;

export function formError(error: string): FormState {
  return { error, saved: false, at: Date.now() };
}

export function formOk(message?: string | null): FormState {
  return { error: null, saved: true, at: Date.now(), message: message ?? null };
}
