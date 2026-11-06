/** Winmau Autodarts Detection, typical local port. */
export const DEFAULT_AUTODARTS_BASE_URL = "http://127.0.0.1:3180";

export const AUTODARTS_BASE_URL_KEY = "madu.autodarts.baseUrl";

/** Origin only. Paths are dropped — state and events live at `/api` on that host. */
export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter the Autodarts Detection URL");
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("That Autodarts URL is not valid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Autodarts URL must be http or https");
  }
  if (!url.hostname) {
    throw new Error("Autodarts URL needs a host");
  }
  return `${url.protocol}//${url.host}`;
}
