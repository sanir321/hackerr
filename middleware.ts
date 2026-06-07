import { NextRequest, NextResponse, NextFetchEvent } from "next/server";
import { authkit } from "@workos-inc/authkit-nextjs";

const REFERRAL_COOKIE_NAME = "umbraa_ref";
const REFERRAL_COOKIE_CREATED_AT_NAME = "umbraa_ref_at";
const REFERRAL_CODE_PATTERN = /^[a-zA-Z0-9_-]{6,64}$/;

function extractErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return (err as any).message ?? "";
  }
  return "";
}

function isRateLimitError(err: unknown): boolean {
  const normalized = extractErrorMessage(err).toLowerCase();
  const statusCode = (err as any)?.status;
  const causeStatusCode = (err as any)?.cause?.status;
  return (
    statusCode === 429 ||
    causeStatusCode === 429 ||
    normalized.includes("rate limit exceeded") ||
    normalized.includes("too many requests")
  );
}

function isValidReferralCode(code: string | null | undefined): boolean {
  return typeof code === "string" && REFERRAL_CODE_PATTERN.test(code);
}

function getReferralRewardConfig() {
  const parsePositiveNumber = (raw: string | undefined, fallback: number): number => {
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  return {
    enabled: process.env.REFERRAL_PROGRAM_ENABLED !== "false",
    referrerRewardDollars: parsePositiveNumber(process.env.REFERRAL_REFERRER_REWARD_DOLLARS, 10),
    referredSignupBonusUnits: parsePositiveNumber(process.env.REFERRAL_REFERRED_SIGNUP_BONUS_UNITS, 10),
    attributionMaxUserAgeDays: parsePositiveNumber(process.env.REFERRAL_ATTRIBUTION_MAX_USER_AGE_DAYS, 7),
    cookieMaxAgeSeconds: Math.round(parsePositiveNumber(process.env.REFERRAL_COOKIE_MAX_AGE_DAYS, 30) * 24 * 60 * 60),
  };
}

export const runtime = "nodejs";

const UNAUTHENTICATED_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/signup/auth",
  "/logout",
  "/api/clear-auth-cookies",
  "/api/workos/webhook",
  "/callback",
  "/auth-error",
  "/privacy-policy",
  "/terms-of-service",
  "/download",
  "/manifest.json",
]);

function getRedirectUri(): string | undefined {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/callback`;
  }
  return undefined;
}

function isUnauthenticatedPath(pathname: string): boolean {
  if (UNAUTHENTICATED_PATHS.has(pathname)) {
    return true;
  }
  if (pathname.startsWith("/share/")) {
    return true;
  }
  if (pathname.startsWith("/invite/")) {
    return true;
  }
  return false;
}

function isBrowserRequest(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

const SESSION_HEADER = "x-workos-session";

function withReferralCookie(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const referralCode =
    request.nextUrl.searchParams.get("referral_code") ??
    request.nextUrl.searchParams.get("ref");
  if (!referralCode || !isValidReferralCode(referralCode)) return response;

  const config = getReferralRewardConfig();
  if (!config.enabled) return response;

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: config.cookieMaxAgeSeconds,
    path: "/",
  };

  response.cookies.set(REFERRAL_COOKIE_NAME, referralCode, cookieOptions);
  response.cookies.set(
    REFERRAL_COOKIE_CREATED_AT_NAME,
    String(Date.now()),
    cookieOptions,
  );

  return response;
}

export default async function middleware(
  request: NextRequest,
  _event: NextFetchEvent,
) {
  const pathname = request.nextUrl.pathname;

  let refreshHitRateLimit = false;
  const hadSessionCookie = request.cookies.has("wos-session");

  const { session, headers, authorizationUrl } = await authkit(request, {
    redirectUri: getRedirectUri(),
    eagerAuth: true,
    onSessionRefreshError: ({ error }) => {
      if (isRateLimitError(error)) {
        refreshHitRateLimit = true;
        console.warn(
          "[Auth Middleware] WorkOS rate limit hit during session refresh",
        );
      }
    },
  });

  const requestHeaders = buildRequestHeaders(request, headers);
  const responseHeaders = buildResponseHeaders(headers);

  if (session.user || isUnauthenticatedPath(pathname)) {
    return withReferralCookie(
      request,
      NextResponse.next({
        request: { headers: requestHeaders },
        headers: responseHeaders,
      }),
    );
  }

  if (hadSessionCookie && refreshHitRateLimit) {
    if (!isBrowserRequest(request)) {
      const rateLimitHeaders = new Headers(responseHeaders);
      rateLimitHeaders.set("Retry-After", "5");
      return withReferralCookie(
        request,
        NextResponse.json(
          { code: "rate_limited", message: "Please retry shortly." },
          { status: 503, headers: rateLimitHeaders },
        ),
      );
    }
    return withReferralCookie(
      request,
      NextResponse.next({
        request: { headers: requestHeaders },
        headers: responseHeaders,
      }),
    );
  }

  if (!isBrowserRequest(request)) {
    return withReferralCookie(
      request,
      NextResponse.json(
        {
          code: "unauthorized:auth",
          message: "You need to sign in before continuing.",
          cause: "Session expired or invalid",
        },
        { status: 401, headers: responseHeaders },
      ),
    );
  }

  if (!authorizationUrl) {
    console.error("[Auth Middleware] authorizationUrl unavailable", {
      pathname,
      hasSession: !!session.user,
    });
    const errorUrl = new URL("/auth-error", request.url);
    errorUrl.searchParams.set("code", "503");
    return withReferralCookie(
      request,
      NextResponse.redirect(errorUrl, { headers: responseHeaders }),
    );
  }

  return withReferralCookie(
    request,
    NextResponse.redirect(authorizationUrl, { headers: responseHeaders }),
  );
}

function buildRequestHeaders(
  request: NextRequest,
  authkitHeaders: Headers,
): Headers {
  const merged = new Headers(request.headers);
  authkitHeaders.forEach((value, key) => {
    if (key.startsWith("x-")) {
      merged.set(key, value);
    }
  });
  return merged;
}

function buildResponseHeaders(authkitHeaders: Headers): Headers {
  const responseHeaders = new Headers(authkitHeaders);
  responseHeaders.delete(SESSION_HEADER);
  return responseHeaders;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
