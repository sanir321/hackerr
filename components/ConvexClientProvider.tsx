"use client";

import { ReactNode, useState } from "react";
import { ConvexReactClient, ConvexProviderWithAuth, ConvexProvider } from "convex/react";
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import { useAuthFromAuthKit } from "@/lib/auth/use-auth-from-authkit";

const noop = () => {};

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";
    try {
      return new ConvexReactClient(url);
    } catch (e) {
      console.warn("Failed to initialize Convex client during build:", e);
      return null;
    }
  });

  const hasRealUrl = !!process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convex) {
    return <AuthKitProvider onSessionExpired={noop}>{children}</AuthKitProvider>;
  }

  return (
    <AuthKitProvider onSessionExpired={noop}>
      {hasRealUrl ? (
        <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
          {children}
        </ConvexProviderWithAuth>
      ) : (
        <ConvexProvider client={convex}>
          {children}
        </ConvexProvider>
      )}
    </AuthKitProvider>
  );
}
