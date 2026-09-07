/** Only allow the local Library route as a lesson return destination. */
export function libraryReturnPath(search: string): string | null {
  const value = new URLSearchParams(search).get("returnTo");
  if (!value) return null;
  try {
    const url = new URL(value, "https://plu.local");
    if (!value.startsWith("/library/") || url.origin !== "https://plu.local" || url.pathname !== "/library/") return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
