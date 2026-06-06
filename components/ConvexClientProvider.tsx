"use client";

import { ReactNode, useState } from "react";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";

const noop = () => {};

// Mock Convex auth hook — always returns a token so Convex considers us authenticated.
// Queries will fail server-side (invalid JWT), but components handle missing data gracefully.
function useMockConvexAuth() {
  return {
    isLoading: false,
    isAuthenticated: true,
    fetchAccessToken: async (args?: { forceRefreshToken?: boolean }) => {
      if (args?.forceRefreshToken) return null; // Don't retry after rejection
      return "mock-convex-token";
    },
  };
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => {
    const client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    return client;
  });

  return (
    <AuthKitProvider onSessionExpired={noop}>
      <ConvexProviderWithAuth client={convex} useAuth={useMockConvexAuth}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}
