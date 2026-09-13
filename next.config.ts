import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trace only the files the server actually reaches and emit a self-contained
  // bundle. The runtime layer used to copy the whole production node_modules —
  // most of it build tooling the server never loads.
  output: "standalone",
  // The data directory is a mounted volume, never part of the build. The image
  // build can't see it (.dockerignore), but a local `next build` can, and a
  // database has no business inside a bundle.
  outputFileTracingExcludes: { "*": ["./data/**"] },
  // better-sqlite3 is a native module; keep it external so Next doesn't try
  // to bundle the .node binary.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
