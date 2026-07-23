import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-icons se resuelve desde node_modules en runtime: son ~52,000 iconos
  // que solo usa la ruta /api/imin/icons, y empaquetarlos inflaria la funcion.
  serverExternalPackages: ["better-sqlite3", "react-icons"],
  // El generador de sitios lee el bridge de IMIN en runtime para incrustarlo en
  // el proyecto generado; hay que incluir el archivo en el bundle de la funcion.
  outputFileTracingIncludes: {
    "/api/dashboard/projects/route": ["./imin-bridge/**"],
  },
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
