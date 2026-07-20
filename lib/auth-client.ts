import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "@/lib/auth";

// En el navegador siempre se habla contra el propio origen; en SSR hace falta
// una URL absoluta.
let base = "";
if (typeof window !== "undefined") {
  base = window.location.origin;
} else {
  const url = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  if (url != null && url !== "") base = url;
}

export const authClient = createAuthClient({
  ...(base !== "" ? { baseURL: base } : {}),
  plugins: [inferAdditionalFields<typeof auth>()],
  sessionOptions: {
    refetchOnWindowFocus: false,
  },
});
