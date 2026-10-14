import type { NextConfig } from "next";

const API_DESTINATION =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://goldenerp-api.vercel.app";
const cleanApiDestination = API_DESTINATION.replace(/\/api\/?$/, "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${cleanApiDestination}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${cleanApiDestination}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
