import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: ['kg-web-attendance.onrender.com'],
    proxy: {
      '/kgapi-login': {
        target: 'http://192.168.100.22:8080',
        rewrite: (path) => path.replace(/^\/kgapi-login/, '/KG_WEB_APP0/KGAPI'),
        changeOrigin: true,
      },
      '/kgapi-data': {
        target: 'http://192.168.100.22:8080',
        rewrite: (path) => path.replace(/^\/kgapi-data/, '/KG_WEB_APP0/KGAPI'),
        changeOrigin: true,
      },
      '/api/kg_web_app': {
        target: 'http://192.168.100.22:8080',
        rewrite: (path) => path.replace(/^\/api\/kg_web_app/, '/KG_WEB_APP0/KGAPI'),
        changeOrigin: true,
      },
      '/api/email_service': {
        target: 'http://172.16.37.219',
        rewrite: (path) => path.replace(/^\/api\/email_service/, '/api'),
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'KG-Web Attendance',
        short_name: 'Attendance',
        description: 'Employee Attendance & Request Portal',
        theme_color: '#0b1120',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
});
