import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "@/lib/auth-client";

export default function AdminRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
