import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-icons se resuelve desde node_modules en runtime: son ~52,000 iconos
  // que solo usa la ruta /api/imin/icons, y empaquetarlos inflaria la funcion.
  serverExternalPackages: ["better-sqlite3", "react-icons"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
