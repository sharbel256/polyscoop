import { useState } from "react";
import { Link } from "react-router-dom";
import { signupForUpdates } from "@/lib/api";
import {
  Telescope,
  Github,
  Mail,
  MessageSquare,
  Shield,
  Loader2,
  Check,
} from "lucide-react";

function SignupForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await signupForUpdates(email.trim());
      setStatus("success");
      setMessage(res.message);
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("something went wrong, try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <Check className="h-3.5 w-3.5" />
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="email"
        placeholder="your email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === "error") setStatus("idle");
        }}
        required
        className="input h-8 w-48 text-xs"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-secondary inline-flex items-center gap-1.5 text-xs"
      >
        {status === "loading" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Mail className="h-3.5 w-3.5" />
        )}
        sign up for updates
      </button>
      {status === "error" && (
        <span className="text-xs text-red-400">{message}</span>
      )}
    </form>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-surface-dark-3 bg-surface-dark-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand + links */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Telescope className="h-4 w-4" />
              <span>polyscoop</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>powered by polymarket</span>
              <a
                href="https://github.com/sharbel/polyscoop"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-brand-400"
              >
                <Github className="h-3.5 w-3.5" />
                github
              </a>
              <Link
                to="/transparency"
                className="inline-flex items-center gap-1 hover:text-brand-400"
              >
                <Shield className="h-3.5 w-3.5" />
                how it works
              </Link>
              <a
                href="mailto:hello@polyscoop.com?subject=suggestion%20for%20polyscoop"
                className="inline-flex items-center gap-1 hover:text-brand-400"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                suggest improvements
              </a>
            </div>
          </div>

          {/* Email signup */}
          <SignupForm />
        </div>
      </div>
    </footer>
  );
}
