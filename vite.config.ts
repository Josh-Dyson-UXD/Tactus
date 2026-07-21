import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Forwards /api (REST + the WS upgrade) to the deployment proxy in
  // server/, so `npm run dev` can exercise the exact same path production
  // uses instead of only the direct-to-HA dev mode. Requires the proxy
  // running separately (`npm run start --prefix server`, its own HA_URL/
  // HA_TOKEN in server/.env) — see README "Deployment".  Only takes effect
  // when VITE_HA_URL is unset, since HAClient defaults its base URL to
  // window.location.origin (here, :5173) in that case; an explicit
  // VITE_HA_URL still goes straight to HA and never touches this proxy.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
