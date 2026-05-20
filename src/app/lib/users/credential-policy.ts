export function hasUsablePassword(password: string | null | undefined): boolean {
  return String(password ?? "").trim().length > 0;
}

export function activeUserCreateRequiresPassword(input: {
  isActive?: boolean | null;
  password?: string | null;
}): boolean {
  return (input.isActive ?? true) === true && !hasUsablePassword(input.password);
}

export function activationRequiresPassword(input: {
  nextIsActive?: boolean | null;
  hasCredential: boolean;
  password?: string | null;
}): boolean {
  return input.nextIsActive === true && !input.hasCredential && !hasUsablePassword(input.password);
}

export function passwordConfirmationError(input: {
  password?: string | null;
  confirmPassword?: string | null;
}): string | null {
  const password = String(input.password ?? "");
  const confirmPassword = String(input.confirmPassword ?? "");
  if (!password && !confirmPassword) return null;
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}
