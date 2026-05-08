import { api } from "@/lib/api";

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

export async function getUserPreferences() {
  return api("/users/me/preferences");
}

export async function updateUserPreferences(payload) {
  return api("/users/me/preferences", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
