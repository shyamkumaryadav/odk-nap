import { defineConfig } from "vite";

export default defineConfig({
  base: "/odk-nap/",
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
      {
        find: "leaflet.gridlayer.googlemutant",
        replacement:
          "leaflet.gridlayer.googlemutant/dist/Leaflet.GoogleMutant.js",
      },
      {
        find: "leaflet",
        replacement: "leaflet/dist/leaflet-src.js",
      },
    ],
  },

  optimizeDeps: {
    exclude: ["enketo/widgets"],
  },
  define: {
    "import.meta.env.LAST_BUILD": JSON.stringify(new Date().toString()),
  },
});
