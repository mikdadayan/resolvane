import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import CreateUserDialog from "./components/CreateUserDialog";
import EditUserDialog from "./components/EditUserDialog";
import DeleteConfirmDialog from "./components/DeleteConfirmDialog";
import UsersTable from "./components/UsersTable";
import type { User } from "./types";

type DialogState =
  | { type: "create" }
  | { type: "edit"; user: User }
  | { type: "delete"; user: User }
  | null;

async function fetchUsers(): Promise<User[]> {
  const res = await axios.get(`${import.meta.env.VITE_SERVER_BASE_URL}/api/users`, {
    withCredentials: true,
  });
  return res.data.users;
}

export default function UsersPage() {
  const [dialog, setDialog] = useState<DialogState>(null);

  const { data: users, isPending, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const closeDialog = () => setDialog(null);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
        <Button onClick={() => setDialog({ type: "create" })}>
          <UserPlus className="mr-2 h-4 w-4" />
          New User
        </Button>
      </div>

      <CreateUserDialog
        open={dialog?.type === "create"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      />
      <EditUserDialog
        user={dialog?.type === "edit" ? dialog.user : null}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      />
      <DeleteConfirmDialog
        user={dialog?.type === "delete" ? dialog.user : null}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      />

      {error && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}

      <UsersTable
        users={users}
        isPending={isPending}
        onEdit={(user) => setDialog({ type: "edit", user })}
        onDelete={(user) => setDialog({ type: "delete", user })}
      />
    </div>
  );
}
