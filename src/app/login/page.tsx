"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, registerUser } from "@/services/authService";
import { AppearanceMenu } from "@/components/AppearanceMenu";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const router = useRouter();
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await registerUser(email, password, displayName);
      } else {
        await loginUser(email, password);
      }
      await refreshUser();
      router.replace("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="codex-bg flex min-h-screen items-center justify-center px-4 py-8">
      <div className="codex-surface relative w-full max-w-md rounded-2xl p-8 shadow-xl">
        <div className="absolute right-4 top-4">
          <AppearanceMenu />
        </div>
        <h1 className="codex-logo mb-2 text-center text-3xl font-bold">Codex</h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          Coding discussion forum — web edition
        </p>

        <div className="codex-segmented mb-6 flex rounded-lg p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md py-2 text-sm capitalize ${
                mode === m ? "codex-chip-active" : "codex-text-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="codex-input w-full rounded-lg px-4 py-3"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="codex-input w-full rounded-lg px-4 py-3"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="codex-input w-full rounded-lg px-4 py-3"
            required
            minLength={6}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="codex-btn-accent w-full rounded-lg py-3 disabled:opacity-50"
          >
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}