import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Ticket, Users, Moon, Sun } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useTheme } from "@/lib/theme";
import { Role } from "@helpdesk/core";

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
    isActive
      ? "bg-primary text-primary-foreground font-medium"
      : "text-muted-foreground hover:text-foreground"
  }`;

export default function Navbar() {
  const { data: session } = authClient.useSession();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => navigate("/login") },
    });
  };

  return (
    <nav className="flex items-center justify-between px-6 py-3.5 bg-background border-b border-border">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2 mr-5 hover:opacity-80 transition-opacity">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary">
            <span className="font-serif text-xs font-medium text-primary-foreground">H</span>
          </span>
          <span className="font-serif text-lg font-medium tracking-tight text-foreground">
            Helpdesk
          </span>
        </Link>
        {session && (
          <NavLink to="/dashboard" className={navLinkClassName}>
            <LayoutDashboard className="size-3.5" />
            Dashboard
          </NavLink>
        )}
        {session && (
          <NavLink to="/tickets" className={navLinkClassName}>
            <Ticket className="size-3.5" />
            Tickets
          </NavLink>
        )}
        {session?.user.role === Role.admin && (
          <NavLink to="/users" className={navLinkClassName}>
            <Users className="size-3.5" />
            Users
          </NavLink>
        )}
      </div>
      <div className="flex items-center gap-4">
        {session && (
          <span className="text-sm text-muted-foreground">{session.user.name}</span>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <button
          onClick={handleSignOut}
          className="text-sm px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
