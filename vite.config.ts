import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

const buildTarget = process.env.BUILD_TARGET;

export default defineConfig({
  plugins: [tailwindcss(), vue()],

  // Enable Vue DevTools hook in all modes for the demo
  define: {
    __VUE_PROD_DEVTOOLS__: true,
  },

  build: buildTarget === "auto"
    ? {
        lib: {
          entry: resolve(import.meta.dirname, "src/auto.ts"),
          name: "vueScan",
          formats: ["es", "cjs", "iife"],
          fileName: (format) => format === "iife" ? "auto.global.js" : `auto.${format === "es" ? "js" : "cjs"}`,
        },
        rolldownOptions: {
          external: ["vue"],
          output: {
            globals: {
              vue: "Vue",
            },
          },
        },
      }
    : {
        lib: {
          entry: resolve(import.meta.dirname, "src/main.ts"),
          name: "vue-scan",
          fileName: (format) => `vue-scan.${format === "es" ? "js" : "cjs"}`,
        },
        rolldownOptions: {
          external: ["vue"],
          output: {
            globals: {
              vue: "Vue",
            },
          },
        },
      },
});
