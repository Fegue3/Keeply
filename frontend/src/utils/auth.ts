export const getAuthToken = () => {
  try {
    const raw = localStorage.getItem('keeply_token');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  return !!token?.idToken; // ou verifica expiry se quiseres
};

export const getUserSub = () => {
  const token = getAuthToken();
  return token?.sub || null;
};

export const logout = () => {
  localStorage.removeItem('keeply_token');
  window.location.href = '/login';
};
