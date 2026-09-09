/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Emits .next/standalone so the Docker runner stage needs no node_modules copy.
  output: 'standalone',
};

export default nextConfig;
