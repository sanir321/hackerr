"use client";

import { ReactNode, useState } from "react";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import { useAuthFromAuthKit } from "@/lib/auth/use-auth-from-authkit";

const noop = () => {};

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => {
    const client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    return client;
  });

  return (
    <AuthKitProvider onSessionExpired={noop}>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}
