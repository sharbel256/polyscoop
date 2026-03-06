import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/getit/AuthGuard";

export function GetitLayout() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* ambient background */}
      <div className="fixed inset-0 -z-10 bg-surface">
        <div className="absolute left-0 top-0 h-[50vh] w-[50vw] rounded-full bg-brand-950/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[40vh] w-[40vw] rounded-full bg-purple-950/15 blur-[100px]" />
      </div>

      <AuthGuard>
        {/* header */}
        <header className="border-b border-border/30 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-6">
              <Link
                to="/getit"
                className="text-h3 font-bold tracking-tight text-foreground"
              >
                getit
              </Link>
              {isAdmin && (
                <nav className="flex gap-4 text-caption">
                  <Link
                    to="/getit/admin"
                    className="text-foreground/60 transition-colors hover:text-foreground"
                  >
                    admin
                  </Link>
                </nav>
              )}
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <span className="text-micro text-foreground/50">
                  {user.email}
                </span>
              )}
              <button onClick={logout} className="btn-ghost text-caption">
                logout
              </button>
            </div>
          </div>
        </header>

        {/* content */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          <Outlet />
        </main>
      </AuthGuard>
    </div>
  );
}
