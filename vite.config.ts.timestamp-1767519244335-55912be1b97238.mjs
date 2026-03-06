var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// vite.config.ts
import { defineConfig } from "file:///C:/Users/USUARIO/OneDrive/Anexos/%C3%81rea%20de%20Trabalho/toriq/vertical-on-sistema-de-sst/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/USUARIO/OneDrive/Anexos/%C3%81rea%20de%20Trabalho/toriq/vertical-on-sistema-de-sst/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///C:/Users/USUARIO/OneDrive/Anexos/%C3%81rea%20de%20Trabalho/toriq/vertical-on-sistema-de-sst/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig(({ mode }) => {
  const plugins = [react()];
  if (mode === "development") {
    try {
      const { componentTagger } = __require("file:///C:/Users/USUARIO/OneDrive/Anexos/%C3%81rea%20de%20Trabalho/toriq/vertical-on-sistema-de-sst/node_modules/lovable-tagger/dist/index.js");
      if (componentTagger) plugins.push(componentTagger());
    } catch {
    }
  }
  const isTest = mode === "test";
  const isProd = mode === "production";
  return {
    ...isTest ? {} : { server: { host: "::", port: 8080 } },
    root: process.cwd(),
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "./src")
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "ui-vendor": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-toast",
              "@radix-ui/react-label",
              "@radix-ui/react-slot"
            ],
            "supabase-vendor": ["@supabase/supabase-js"],
            "query-vendor": ["@tanstack/react-query"],
            "chart-vendor": ["recharts"],
            "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
            "date-vendor": ["date-fns", "react-day-picker"]
          }
        }
      },
      chunkSizeWarningLimit: 1e3,
      minify: isProd,
      sourcemap: !isProd
    },
    esbuild: isProd ? {
      drop: ["console", "debugger"]
    } : void 0
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxVU1VBUklPXFxcXE9uZURyaXZlXFxcXEFuZXhvc1xcXFxcdTAwQzFyZWEgZGUgVHJhYmFsaG9cXFxcdG9yaXFcXFxcdmVydGljYWwtb24tc2lzdGVtYS1kZS1zc3RcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXFVTVUFSSU9cXFxcT25lRHJpdmVcXFxcQW5leG9zXFxcXFx1MDBDMXJlYSBkZSBUcmFiYWxob1xcXFx0b3JpcVxcXFx2ZXJ0aWNhbC1vbi1zaXN0ZW1hLWRlLXNzdFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvVVNVQVJJTy9PbmVEcml2ZS9BbmV4b3MvJUMzJTgxcmVhJTIwZGUlMjBUcmFiYWxoby90b3JpcS92ZXJ0aWNhbC1vbi1zaXN0ZW1hLWRlLXNzdC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tIFwidXJsXCI7XHJcblxyXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xyXG5jb25zdCBfX2Rpcm5hbWUgPSBwYXRoLmRpcm5hbWUoX19maWxlbmFtZSk7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XHJcbiAgY29uc3QgcGx1Z2luczogYW55W10gPSBbcmVhY3QoKV07XHJcbiAgaWYgKG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIikge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgeyBjb21wb25lbnRUYWdnZXIgfSA9IHJlcXVpcmUoXCJsb3ZhYmxlLXRhZ2dlclwiKTtcclxuICAgICAgaWYgKGNvbXBvbmVudFRhZ2dlcikgcGx1Z2lucy5wdXNoKGNvbXBvbmVudFRhZ2dlcigpKTtcclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICAvLyBpZ25vcmUgbWlzc2luZyBwbHVnaW4gaW4gbm9uLWRldiBjb250ZXh0c1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgY29uc3QgaXNUZXN0ID0gbW9kZSA9PT0gJ3Rlc3QnO1xyXG4gIGNvbnN0IGlzUHJvZCA9IG1vZGUgPT09ICdwcm9kdWN0aW9uJztcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIC4uLihpc1Rlc3QgPyB7fSA6IHsgc2VydmVyOiB7IGhvc3Q6IFwiOjpcIiwgcG9ydDogODA4MCB9IH0pLFxyXG4gICAgcm9vdDogcHJvY2Vzcy5jd2QoKSxcclxuICAgIHBsdWdpbnMsXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBcIi4vc3JjXCIpLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIGJ1aWxkOiB7XHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxyXG4gICAgICAgICAgICAndWktdmVuZG9yJzogW1xyXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJyxcclxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRyb3Bkb3duLW1lbnUnLFxyXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0JyxcclxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRhYnMnLFxyXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdG9hc3QnLFxyXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtbGFiZWwnLFxyXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2xvdCcsXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICdzdXBhYmFzZS12ZW5kb3InOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyddLFxyXG4gICAgICAgICAgICAncXVlcnktdmVuZG9yJzogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknXSxcclxuICAgICAgICAgICAgJ2NoYXJ0LXZlbmRvcic6IFsncmVjaGFydHMnXSxcclxuICAgICAgICAgICAgJ2Zvcm0tdmVuZG9yJzogWydyZWFjdC1ob29rLWZvcm0nLCAnQGhvb2tmb3JtL3Jlc29sdmVycycsICd6b2QnXSxcclxuICAgICAgICAgICAgJ2RhdGUtdmVuZG9yJzogWydkYXRlLWZucycsICdyZWFjdC1kYXktcGlja2VyJ10sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcclxuICAgICAgbWluaWZ5OiBpc1Byb2QsXHJcbiAgICAgIHNvdXJjZW1hcDogIWlzUHJvZCxcclxuICAgIH0sXHJcbiAgICBlc2J1aWxkOiBpc1Byb2QgPyB7XHJcbiAgICAgIGRyb3A6IFsnY29uc29sZScsICdkZWJ1Z2dlciddIGFzIGNvbnN0LFxyXG4gICAgfSA6IHVuZGVmaW5lZCxcclxuICB9O1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7QUFBaWMsU0FBUyxvQkFBb0I7QUFDOWQsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUg2UCxJQUFNLDJDQUEyQztBQUs1VSxJQUFNLGFBQWEsY0FBYyx3Q0FBZTtBQUNoRCxJQUFNLFlBQVksS0FBSyxRQUFRLFVBQVU7QUFHekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxVQUFpQixDQUFDLE1BQU0sQ0FBQztBQUMvQixNQUFJLFNBQVMsZUFBZTtBQUMxQixRQUFJO0FBQ0YsWUFBTSxFQUFFLGdCQUFnQixJQUFJLFVBQVEsK0lBQWdCO0FBQ3BELFVBQUksZ0JBQWlCLFNBQVEsS0FBSyxnQkFBZ0IsQ0FBQztBQUFBLElBQ3JELFFBQVE7QUFBQSxJQUVSO0FBQUEsRUFDRjtBQUVBLFFBQU0sU0FBUyxTQUFTO0FBQ3hCLFFBQU0sU0FBUyxTQUFTO0FBRXhCLFNBQU87QUFBQSxJQUNMLEdBQUksU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxNQUFNLE1BQU0sS0FBSyxFQUFFO0FBQUEsSUFDdkQsTUFBTSxRQUFRLElBQUk7QUFBQSxJQUNsQjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsUUFBUSxJQUFJLEdBQUcsT0FBTztBQUFBLE1BQzFDO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBLFVBQ04sY0FBYztBQUFBLFlBQ1osZ0JBQWdCLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFlBQ3pELGFBQWE7QUFBQSxjQUNYO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsWUFDRjtBQUFBLFlBQ0EsbUJBQW1CLENBQUMsdUJBQXVCO0FBQUEsWUFDM0MsZ0JBQWdCLENBQUMsdUJBQXVCO0FBQUEsWUFDeEMsZ0JBQWdCLENBQUMsVUFBVTtBQUFBLFlBQzNCLGVBQWUsQ0FBQyxtQkFBbUIsdUJBQXVCLEtBQUs7QUFBQSxZQUMvRCxlQUFlLENBQUMsWUFBWSxrQkFBa0I7QUFBQSxVQUNoRDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSx1QkFBdUI7QUFBQSxNQUN2QixRQUFRO0FBQUEsTUFDUixXQUFXLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQSxTQUFTLFNBQVM7QUFBQSxNQUNoQixNQUFNLENBQUMsV0FBVyxVQUFVO0FBQUEsSUFDOUIsSUFBSTtBQUFBLEVBQ047QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
