export const SESSION_CLEARED_EVENT = "auth:session-cleared";

export function clearSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}
