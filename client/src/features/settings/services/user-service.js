import { api } from "@/services/api-client";

export async function getCurrentUser() {
  return api("/users/me");
}

export async function getUser(userId) {
  return api(`/users/${userId}`);
}

export async function updateCurrentUser(payload) {
  return api("/users/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateAvatar(avatarUrl) {
  return api("/users/me/avatar", {
    method: "PUT",
    body: JSON.stringify({ avatarUrl }),
  });
}

export async function uploadAvatarImage(file) {
  const formData = new FormData();
  formData.append("avatar", file);
  return api("/users/me/avatar/upload", {
    method: "POST",
    body: formData,
  });
}

export async function getUserSessions() {
  return api("/users/me/sessions");
}

export async function revokeOtherSessions(currentRefreshToken) {
  return api("/users/me/sessions/others", {
    method: "DELETE",
    body: JSON.stringify({ currentRefreshToken }),
  });
}

export async function resendVerificationEmail() {
  return api("/users/me/resend-verification", {
    method: "POST",
  });
}

export async function getUserPreferences(scope = "all") {
  const query = scope ? `?${new URLSearchParams({ scope }).toString()}` : "";
  return api(`/users/me/preferences${query}`);
}

export async function updateUserPreferences(payload) {
  return api("/users/me/preferences", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
