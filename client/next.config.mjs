import { resolveApiTarget } from "./config/api-target.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const api = resolveApiTarget(process.env);
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
