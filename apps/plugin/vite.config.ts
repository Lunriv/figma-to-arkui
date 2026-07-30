import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: "./ui-src",
  plugins: [react(), viteSingleFile()],
  build: {
    target: "es2021",
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000_000,
    cssCodeSplit: false,
    emptyOutDir: true,
    outDir: "../dist",
  },
});
