import { api, ApiClientError } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export interface UsernameCheckResponse {
  status: number;
  ok: boolean;
  username: string;
  assigned: boolean;
  available: boolean;
  suggestions: string[];
}

export async function checkUsernameAvailability(
  username: string
): Promise<UsernameCheckResponse> {
  try {
    const response = await api.get<UsernameCheckResponse>(
      `${endpoints.users.checkUsername}?username=${encodeURIComponent(username)}`,
      { baseURL }
    );

    return response;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw new Error(error.message || "Failed to check username availability.");
    }
    throw new Error("Unexpected error. Please try again later.");
  }
}

// Constant validation helpers
export const RESERVED_USERNAMES = ["admin", "test", "user"];

// Reusable password strength validator
export function isStrongPassword(password: string): boolean {
  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  return hasLength && hasNumber && hasSpecial && hasUpper;
}

// Signup API call
export async function signupUser(requestBody: Record<string, any>) {
  try {
    const response = await api.post<{ message: string }>(
      endpoints.auth.signup,
      requestBody,
      { baseURL }
    );
    return response;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw new Error(err.message || "Signup failed");
    }
    throw new Error("Unexpected error. Please try again later.");
  }
}


/*--------------------------------Login Api call-----------------------------*/

export interface LoginPayload {
  appointmentId: string;
  username: string;
  password: string;
  platoonId?: string;
}

export interface LoginResponse {
  token?: string;
  message?: string;
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  try {
    const response = await api.post<LoginResponse>(
      endpoints.auth.login,
      payload,
      { baseURL }
    );

    if (response.token) {
      localStorage.setItem("authToken", response.token);
    }

    return response;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new Error("Something went wrong. Please try again later.");
  }
}

export async function logout() {
  try {
    await api.post(endpoints.auth.logout, undefined, { skipCsrf: true });

    localStorage.removeItem("authToken");

    return true;
  } catch (err) {
    console.error("Logout error:", err);
    return false;
  }
}