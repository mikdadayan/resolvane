import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Role, updateUserSchema, type UpdateUserInput } from "@resolvane/core";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import UserForm from "./UserForm";
import type { User } from "../types";

type FormValues = UpdateUserInput;

interface Props {
  user: User | null;
  onOpenChange: (open: boolean) => void;
}

export default function EditUserDialog({ user, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevUser, setPrevUser] = useState(user);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: "", email: "", password: "", role: Role.agent },
  });

  if (user !== prevUser) {
    setPrevUser(user);
    setServerError(null);
  }

  useEffect(() => {
    if (user) {
      reset({ name: user.name, email: user.email, password: "", role: user.role });
    }
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      axios.patch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/users/${user!.id}`,
        data,
        { withCredentials: true }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setServerError(null);
      onOpenChange(false);
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setServerError(err.response.data.error);
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    },
  });

  function onSubmit(data: FormValues) {
    setServerError(null);
    mutation.mutate(data);
  }

  function handleOpenChange(value: boolean) {
    if (!value) setServerError(null);
    onOpenChange(value);
  }

  return (
    <Dialog open={!!user} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <UserForm
            register={register as never}
            control={control as never}
            errors={errors}
            serverError={serverError}
            passwordOptional
          />

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
