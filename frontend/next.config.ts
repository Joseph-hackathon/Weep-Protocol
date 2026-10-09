import type { NextConfig } from "next";

// Weep's contract addresses are set per deployment. A production deploy without them would show pages that
// can't pay anyone, so the build stops instead and the last good deployment stays live.
if (process.env.VERCEL_ENV === "production") {
  const missing = ["NEXT_PUBLIC_WEEP_PAY", "NEXT_PUBLIC_WEEP_POOLS"].filter((k) => !/^0x[0-9a-fA-F]{40}$/.test(process.env[k] ?? ""));
  if (missing.length) throw new Error(`Set ${missing.join(" and ")} in Vercel before deploying (see HANDOFF.md).`);
}

const nextConfig: NextConfig = {};

export default nextConfig;
