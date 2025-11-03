// --- Constants ---
export const PASSWORD_RULE = "Must be 8+ characters with uppercase, number, and special character";

export type SignupFormValues = {
  email: string;
  phone: string;
  rank: string;
  name: string;
  note: string;
  username: string;
  password: string;
  confirmPassword: string;
};