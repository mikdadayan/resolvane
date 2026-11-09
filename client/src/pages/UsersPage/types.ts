import type { Role } from "@resolvane/core";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};
