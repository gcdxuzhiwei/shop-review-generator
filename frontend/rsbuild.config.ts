import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: "AI 探店点评生成器",
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
