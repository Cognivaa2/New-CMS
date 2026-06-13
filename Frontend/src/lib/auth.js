const AUTH_KEYS = ["accessToken", "refreshToken", "companyId", "keycloakId", "roleId", "isOwner"];

export function clearAuthStorage() {
  AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

export function getAccessToken() {
  return localStorage.getItem("accessToken");
}

export function isTokenExpired(token) {
  try {
    const { exp } = JSON.parse(atob(token.split(".")[1]));
    return Date.now() >= exp * 1000 - 10_000;
  } catch {
    return true;
  }
}