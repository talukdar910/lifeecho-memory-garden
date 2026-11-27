/** Keep return visits in the app, never on an authentication page. */
export function signInDestination(path?: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/community";
  try {
    const url = new URL(path, "https://lifeecho.local");
    if (url.origin !== "https://lifeecho.local" || url.pathname.startsWith("/auth") || url.pathname.startsWith("/reset-password")) return "/community";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/community";
  }
}