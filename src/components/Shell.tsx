import { Link, useNavigate } from "@tanstack/react-router";
import { Flower2, MapPin, ShieldAlert, Leaf, Home, Target, Trophy, Plus, LogIn, UserCircle, Map } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

export const REGION = "Sierra de Oaxaca";

export type ShellTab = "feed" | "list" | "hunts" | "board" | "map";

export function Shell({ children, active = "feed" }: { children: ReactNode; active?: ShellTab }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-background flex justify-center">
      <div className="relative w-full max-w-[460px] min-h-screen flex flex-col bg-background border-x border-border/60 shadow-[0_0_40px_-20px_rgba(0,0,0,0.15)]">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/60 sticky top-0 z-20 bg-background/95 backdrop-blur">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf text-leaf-foreground">
              <Flower2 size={17} />
            </span>
            <div className="leading-tight">
              <div className="font-display text-[17px] tracking-tight">
                Orqu<span className="font-bold text-orchid">ID</span>ea
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                por OrchidArc · <MapPin size={9} /> {REGION}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/reportar"
              aria-label="Reportar comercio ilegal"
              className="grid h-9 w-9 place-items-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition"
            >
              <ShieldAlert size={16} />
            </Link>
            <span className="hidden xs:inline-flex items-center gap-1 rounded-full bg-leaf/10 text-leaf px-2 py-1 text-[10px] font-semibold">
              <Leaf size={10} /> Solo&nbsp;observar
            </span>
            {!loading && (
              user ? (
                <Link to="/lista" className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-foreground" aria-label="Mi cuenta">
                  <UserCircle size={18} />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1 rounded-full bg-leaf text-leaf-foreground px-3 py-1.5 text-xs font-semibold"
                >
                  <LogIn size={12} /> Entrar
                </Link>
              )
            )}
          </div>
        </header>

        <main className="flex-1 pb-24">{children}</main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] bg-background/95 backdrop-blur border-t border-border/60 px-2 py-2 z-20 flex items-center justify-around">
          <NavLink to="/" icon={<Home size={20} />} label="Comunidad" active={active === "feed"} />
          <NavLink to="/mapa" icon={<Map size={20} />} label="Mapa" active={active === "map"} />
          <button
            type="button"
            onClick={() => navigate({ to: user ? "/capture" : "/login" })}
            aria-label="Nuevo avistamiento"
            className="grid h-14 w-14 -mt-6 place-items-center rounded-full bg-orchid text-orchid-foreground shadow-lg shadow-orchid/30 hover:scale-105 transition"
          >
            <Plus size={26} />
          </button>
          <NavLink to="/retos" icon={<Target size={20} />} label="Retos" active={active === "hunts"} />
          <NavLink to="/ranking" icon={<Trophy size={20} />} label="Ranking" active={active === "board"} />
        </nav>
      </div>
    </div>
  );
}

function NavLink({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition " +
        (active ? "text-leaf" : "text-muted-foreground hover:text-foreground")
      }
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
