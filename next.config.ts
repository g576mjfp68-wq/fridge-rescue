import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "www.themealdb.com", pathname: "/images/**" }],
  },
};

export default nextConfig;
