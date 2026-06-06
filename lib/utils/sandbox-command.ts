// Production Convex URL
const PRODUCTION_CONVEX_URL = "https://convex.haiusercontent.com";

// Add --convex-url flag if running against non-production backend
export const convexUrlFlag =
  process.env.NEXT_PUBLIC_CONVEX_URL &&
  process.env.NEXT_PUBLIC_CONVEX_URL !== PRODUCTION_CONVEX_URL
    ? ` --convex-url ${process.env.NEXT_PUBLIC_CONVEX_URL}`
    : "";

export const runCommand = "npx @umbraa/local@latest";
