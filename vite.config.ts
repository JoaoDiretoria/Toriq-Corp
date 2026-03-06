import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins: any[] = [react()];
  if (mode === "development") {
    try {
      const { componentTagger } = require("lovable-tagger");
      if (componentTagger) plugins.push(componentTagger());
    } catch {
      // ignore missing plugin in non-dev contexts
    }
  }

  const isTest = mode === 'test';
  const isProd = mode === 'production';

  return {
    root: process.cwd(),
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-label',
              '@radix-ui/react-slot',
            ],
            'supabase-vendor': ['@supabase/supabase-js'],
            'query-vendor': ['@tanstack/react-query'],
            'chart-vendor': ['recharts'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'date-vendor': ['date-fns', 'react-day-picker'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      minify: isProd,
      sourcemap: !isProd,
    },
    esbuild: isProd ? {
      drop: ['console', 'debugger'] as const,
    } : undefined,
    server: isTest ? undefined : {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 8080,
      },
    },
  };
});
