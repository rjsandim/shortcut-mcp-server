import { SHORTCUT_TOKEN, SHORTCUT_BASE_URL } from "./config.js";

export async function shortcutApi(endpoint, options = {}) {
  const response = await fetch(`${SHORTCUT_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Shortcut-Token": SHORTCUT_TOKEN,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shortcut API error (${response.status}): ${error}`);
  }

  if (response.status === 204) return { success: true };
  return response.json();
}
