import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { codeToHtml } from "shiki";
import type { Plugin } from "vite";

const snippets: Record<string, { code: string; lang: string }> = {
  __SHIKI_IMPORT__: {
    lang: "ts",
    code: `import { startTracking } from "@fdemb1/vue-scan";
import { createApp } from "vue";

startTracking();
createApp(App).mount("#app");`,
  },
  __SHIKI_VITE_CONFIG__: {
    lang: "ts",
    code: `import { defineConfig } from "vite";

export default defineConfig({
  define: {
    __VUE_PROD_DEVTOOLS__: true,
  },
  plugins: [vue()],
});`,
  },
  __SHIKI_SCRIPT_TAG__: {
    lang: "html",
    code: `<script
  crossorigin="anonymous"
  src="//unpkg.com/@fdemb1/vue-scan/dist/auto.global.js">
</script>`,
  },
};

function shikiPlugin(): Plugin {
  let rendered: Record<string, string> = {};

  return {
    name: "shiki",
    async buildStart() {
      for (const [key, { code, lang }] of Object.entries(snippets)) {
        rendered[key] = await codeToHtml(code, { lang, theme: "kanagawa-wave" });
      }
    },
    transform(code, id) {
      if (!id.endsWith("lib/code.ts")) return;
      let result = code;
      for (const [key, html] of Object.entries(rendered)) {
        result = result.replace(`\`${key}\``, JSON.stringify(html));
      }
      return result;
    },
  };
}

export default defineConfig({
  base: "/vue-scan/",
  plugins: [shikiPlugin(), vue(), tailwindcss()],
  define: {
    // Enable Vue DevTools in production for vue-scan
    __VUE_PROD_DEVTOOLS__: true,
  },
});
