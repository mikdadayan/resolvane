import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../../../server/src/lib/auth";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SERVER_BASE_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
});
