import { runtimeConfig } from "@/lib/runtime-config";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../../../server/src/lib/auth";

export const authClient = createAuthClient({
  baseURL: runtimeConfig.apiBaseUrl,
  plugins: [inferAdditionalFields<typeof auth>()],
});
