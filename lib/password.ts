export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 72;

export type PasswordCheck = {
  id: string;
  label: string;
  ok: boolean;
};

export function passwordChecks(password: string): PasswordCheck[] {
  return [
    {
      id: "length",
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      ok: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "lower",
      label: "One lowercase letter",
      ok: /[a-z]/.test(password),
    },
    {
      id: "upper",
      label: "One uppercase letter",
      ok: /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "One number",
      ok: /\d/.test(password),
    },
  ];
}

export function validatePassword(
  password: string,
  confirm?: string,
): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  const failed = passwordChecks(password).filter((check) => !check.ok);
  if (failed.length) {
    return `Password needs: ${failed.map((check) => check.label.toLowerCase()).join(", ")}.`;
  }
  if (confirm !== undefined && password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}
