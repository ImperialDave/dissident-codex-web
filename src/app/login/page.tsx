"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase";
import { loginUser, registerUser } from "@/services/authService";
import { AppearanceMenu } from "@/components/AppearanceMenu";
import { ColorModeToggle } from "@/components/ColorModeToggle";
import { Input } from "@/components/ui/Input";
import { sanitizeUserError } from "@/lib/sanitizeError";
import { useAuthStore } from "@/stores/authStore";
import clsx from "clsx";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, setSession } = useAuthStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/feed");
  }, [loading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const profile =
        mode === "register"
          ? await registerUser(email, password, displayName)
          : await loginUser(email, password);
      const fbUser = getFirebaseAuth().currentUser;
      if (!fbUser) throw new Error("Sign-in did not complete. Please try again.");
      setSession(fbUser, profile);
      router.replace("/feed");
    } catch (err) {
      setError(sanitizeUserError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="codex-bg flex min-h-dvh items-center justify-center codex-text-muted">
        Loading...
      </div>
    );
  }

  return (
    <div className="codex-bg flex min-h-dvh">
      <div className="codex-main-column mx-auto flex w-full flex-col">
        <header className="flex items-center justify-between px-4 py-3">
          <span className="codex-logo text-2xl">Codex</span>
          <div className="flex items-center gap-1">
            <ColorModeToggle variant="compact" />
            <AppearanceMenu />
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center px-8 py-12">
          <h1 className="text-3xl font-bold">
            {mode === "login" ? "Sign in" : "Join Codex"}
          </h1>
          <p className="mt-2 text-sm codex-text-muted">
            Coding discussion forum — web edition
          </p>

          <div className="codex-tab-bar mt-8">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={clsx("codex-tab capitalize", mode === m && "codex-tab-active")}
              >
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <Input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="codex-btn-accent w-full rounded-full py-3 disabled:opacity-50"
            >
              {submitting ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}