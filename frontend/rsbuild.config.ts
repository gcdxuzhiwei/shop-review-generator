import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: "AI 探店点评生成器",
    favicon: "./public/favicon.svg",
    appIcon: {
      name: "AI 探店点评生成器",
      icons: [
        { src: "./public/icon-180.png", size: 180, target: "apple-touch-icon" },
        { src: "./public/icon-192.png", size: 192, target: "web-app-manifest" },
        { src: "./public/icon-512.png", size: 512, target: "web-app-manifest" },
      ],
    },
  },
  server: {
    base: "/dp",
    port: 10482,
    proxy: {
      "/dp/api": {
        target: "http://localhost:10483",
        changeOrigin: true,
      },
    },
  },
  source: {
    entry: {
      index: "./src/index.tsx",
    },
  },
});
