import UserPool from "../auth/UserPool";
import type { CognitoUser } from "amazon-cognito-identity-js";

export const getAuthToken = () => {
  try {
    const raw = localStorage.getItem("keeply_token");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  return !!token?.idToken; // podes adicionar verificação de expiry aqui se quiseres
};

export const getUserSub = () => {
  const token = getAuthToken();
  return token?.sub || null;
};

/**
 * Logout global → usar em qualquer lado (Navbar, Settings, etc)
 */
export const logout = () => {
  // limpa storage
  localStorage.removeItem("keeply_token");
  localStorage.removeItem("keeply_user_name");
  localStorage.removeItem("keeply_user_initials");

  // termina sessão Cognito
  const currentUser = (UserPool as any).getCurrentUser() as CognitoUser | null;
  if (currentUser) currentUser.signOut();

  // força refresh/redirect
  window.location.replace("/login");
};
