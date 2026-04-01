import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), vue()],

  // Enable Vue DevTools hook in all modes for the demo
  define: {
    __VUE_PROD_DEVTOOLS__: true,
  },

  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/main.ts"),
      name: "vue-toolkit",
      fileName: "vue-toolkit",
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
