import { useState, type ReactNode, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getitLogin } from "@/lib/api";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) return <>{children}</>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await getitLogin(email, password);
      login(res.token, res.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "login failed";
      if (msg.includes("403")) {
        setError("account pending admin approval");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-sm space-y-4 p-6"
      >
        <h2 className="text-h3 text-foreground">log in with resy</h2>
        <p className="text-caption text-foreground/60">
          enter your resy credentials to get started
        </p>

        {error && (
          <div className="rounded-lg bg-loss/10 px-3 py-2 text-caption text-loss">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input w-full"
          required
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input w-full"
          required
        />
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "authenticating..." : "log in"}
        </button>
      </form>
    </div>
  );
}
