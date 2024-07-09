import { defineConfig } from "vite";

export default defineConfig({
  base: "/odk-nap/",
  build: {
    copyPublicDir: false,
  },
  resolve: {
    alias: [
      {
        find: "enketo/widgets",
        replacement: "./src/widget/index.ts",
      },
      {
        find: "enketo/dialog",
        replacement: "./src/dialog.ts",
      },
      {
        find: "enketo/config",
        replacement: "./enketo.config.ts",
      },
    ],
  },

  optimizeDeps: {
    exclude: ["enketo/widgets", "enketo/config"],
  },
  define: {
    "import.meta.env.LAST_BUILD": JSON.stringify(new Date().toString()),
  },
});
