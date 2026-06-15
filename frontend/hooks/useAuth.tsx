"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch, getToken, setToken, removeToken, updateProfile as apiUpdateProfile } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

interface AuthCtx {
  user: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (data: { name?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    apiFetch("/api/auth/me")
      .then((u: AuthUser) => setUser(u))
      .catch(() => removeToken())
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const { token, user } = await apiFetch("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(token);
    setUser(user);
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { token, user } = await apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name: name || "" }),
    });
    setToken(token);
    setUser(user);
  };

  const signOut = () => {
    removeToken();
    setUser(null);
  };

  const updateProfile = async (data: { name?: string; currentPassword?: string; newPassword?: string }) => {
    const updated = await apiUpdateProfile(data);
    setUser((prev) =>
      prev ? { ...prev, name: updated.name, email: updated.email } : null
    );
  };

  return (
    <Ctx.Provider value={{ user, isAdmin: user?.role === "admin", loading, signIn, signUp, signOut, updateProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
