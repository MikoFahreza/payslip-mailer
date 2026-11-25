import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes an email address by trimming whitespace and converting to lowercase.
 * Returns empty string if input is empty or nullish.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Normalizes a configured app URL/origin, ensuring an http(s) scheme is present
 * and returning its clean origin (no trailing slash), or empty string if invalid.
 */
export function normalizeAppOrigin(rawUrl: string | null | undefined): string {
  const trimmed = (rawUrl || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return "";
  }
}
