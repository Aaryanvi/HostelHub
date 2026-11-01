import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getStoredUser,
  getToken,
  login as loginRequest,
  register as registerRequest,
  logout as logoutRequest,
  fetchCurrentUser,
  updateProfile as updateProfileRequest,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const freshUser = await fetchCurrentUser();
        setUser(freshUser);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, []);

  const login = useCallback(async (email, password) => {
    const loggedInUser = await loginRequest(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (payload) => {
    const newUser = await registerRequest(payload);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    logoutRequest();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const updated = await updateProfileRequest(payload);
    setUser((prev) => ({ ...prev, ...updated }));
    return updated;
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
