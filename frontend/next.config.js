/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        './node_modules/@swc/core-wasm',
        './node_modules/@napi-rs/simple',
      ],
    },
  },
}

module.exports = nextConfig
