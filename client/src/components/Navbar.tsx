import { useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";

export default function Navbar() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => navigate("/login") },
    });
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-gray-900">
      <span className="text-lg font-semibold text-white">Helpdesk</span>
      <div className="flex items-center gap-4">
        {session && (
          <span className="text-sm text-gray-300">{session.user.name}</span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-100 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
