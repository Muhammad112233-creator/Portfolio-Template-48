import { defineConfig } from 'vite';

export default defineConfig({
  // Use the repository path on GitHub Pages and relative paths in the local preview.
  base: process.env.GITHUB_ACTIONS ? '/friday-society-portfolio/' : './',
  // Needed for Arena's proxied live preview host (Vite otherwise rejects it).
  server: { host: '0.0.0.0', allowedHosts: true },
});
