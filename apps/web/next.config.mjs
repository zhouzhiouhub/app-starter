/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@app-starter/design-tokens",
    "@app-starter/renderer",
    "@app-starter/schema",
    "@app-starter/ui"
  ]
};

export default nextConfig;
