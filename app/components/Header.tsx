"use client";

import React from "react";
import Link from "next/link";
import { UmbraaSVG } from "@/components/icons/umbraa-svg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@workos-inc/authkit-nextjs/components";

interface HeaderProps {
  chatTitle?: string;
  hideDownload?: boolean;
}

const Header: React.FC<HeaderProps> = ({ chatTitle, hideDownload = false }) => {
  const { user, loading } = useAuth();

  return (
    <header className="w-full px-6 max-sm:px-4 flex-shrink-0">
      {/* Desktop header */}
      <div className="py-[10px] flex gap-10 items-center justify-between max-md:hidden">
        <div className="flex items-center gap-2">
          <UmbraaSVG theme="dark" scale={0.15} />
          <span className="text-foreground text-xl font-semibold">
            Umbraa
          </span>
        </div>
        <div className="flex flex-1 gap-2 justify-between items-center">
          {chatTitle && (
            <div className="flex-1 text-center">
              <span className="text-foreground text-lg font-medium truncate">
                {chatTitle}
              </span>
            </div>
          )}
          {!chatTitle && <div className="flex gap-[40px]"></div>}
          {!loading && !user && (
            <div className="flex gap-2 items-center">
              <Button
                data-testid="sign-in-button"
                onClick={() => window.location.href = "/login"}
                variant="default"
                size="default"
                className="min-w-[74px] rounded-[10px]"
              >
                Sign in
              </Button>
              <Button
                data-testid="sign-up-button"
                onClick={() =>
                  window.location.href = "/signup"
                }
                variant="outline"
                size="default"
                className="min-w-16 rounded-[10px]"
              >
                Get started
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile header */}
      <div className="py-3 flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2">
          <Link href="/">
            <UmbraaSVG theme="dark" scale={0.12} />
            <span className="text-foreground text-lg font-semibold">
              Umbraa
            </span>
          </Link>
        </div>
        {!loading && !user && (
          <div className="flex items-center gap-2">
            <Button
              data-testid="sign-in-button-mobile"
              onClick={() => window.location.href = "/login"}
              variant="default"
              size="sm"
              className="rounded-[10px]"
            >
              Sign in
            </Button>
            <Button
              data-testid="sign-up-button-mobile"
              onClick={() =>
                window.location.href = "/signup"
              }
              variant="outline"
              size="sm"
              className="rounded-[10px]"
            >
              Get started
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
