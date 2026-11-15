// The desktop website. It shares the phone app's data layer and components through the
// src/shared symlink (-> apps/web/src). Keeping symlinks unresolved makes those files build as
// part of this app, with this app's React and Next, so there is one copy of each at runtime.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  webpack(config, { dev }) {
    config.resolve.symlinks = false;
    // The file watcher otherwise misses edits to the shared files behind the symlink.
    if (dev) config.watchOptions = { ...config.watchOptions, followSymlinks: true };
    return config;
  },
};
export default nextConfig;
