"use client";

import { create } from "zustand";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { loadCurrentUserAndCheckBan, logout as authLogout } from "@/services/authService";
import { canModerate, type User } from "@/models";
import { isFounderEmail, resolveRole } from "@/lib/utils";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  init: () => () => void;
  setSession: (firebaseUser: FirebaseUser, user: User) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  isModerator: () => boolean;
  isFounder: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  user: null,
  loading: true,
  error: null,

  init: () => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        set({ firebaseUser: null, user: null, loading: false, error: null });
        return;
      }
      try {
        const user = await loadCurrentUserAndCheckBan(fbUser.uid, fbUser.email);
        set({ firebaseUser: fbUser, user, loading: false, error: null });
      } catch (e) {
        set({
          firebaseUser: null,
          user: null,
          loading: false,
          error: e instanceof Error ? e.message : "Auth error",
        });
      }
    });
    return unsub;
  },

  setSession: (firebaseUser, user) => {
    set({ firebaseUser, user, loading: false, error: null });
  },

  refreshUser: async () => {
    const auth = getFirebaseAuth();
    const fbUser = get().firebaseUser ?? auth.currentUser;
    if (!fbUser) return;
    try {
      const user = await loadCurrentUserAndCheckBan(fbUser.uid, fbUser.email);
      set({ firebaseUser: fbUser, user, error: null });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Auth error",
      });
      throw e;
    }
  },

  logout: async () => {
    await authLogout();
    set({ firebaseUser: null, user: null });
  },

  isModerator: () => {
    const { user, firebaseUser } = get();
    return canModerate(resolveRole(user, firebaseUser?.email));
  },

  isFounder: () => {
    const { user, firebaseUser } = get();
    return isFounderEmail(firebaseUser?.email) || resolveRole(user, firebaseUser?.email) === "FOUNDER";
  },
}));
