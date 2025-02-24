import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  distDir: "dist",

  // async redirects() {
  //   return [
  //     {
  //       source: "/",
  //       destination: "/raster",
  //       permanent: true,
  //     },
  //   ];
  // },
};

export default nextConfig;
