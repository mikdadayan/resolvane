import { Link, useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";

export default function Navbar() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => navigate("/login") },
    });
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-background border-b border-border">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-lg font-semibold text-foreground hover:opacity-80 transition-opacity">Helpdesk</Link>
        {session?.user.role === "admin" && (
          <Link to="/users" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        {session && (
          <span className="text-sm text-muted-foreground">{session.user.name}</span>
        )}
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
