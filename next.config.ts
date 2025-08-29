import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["tree-sitter", "tree-sitter-kotlin", "node-gyp-build"],
};

export default nextConfig;
