import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 10240 }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 10240 }),
  ],
  build: {
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'query-vendor': ['@tanstack/react-query', 'axios', 'zustand'],
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
          'stream-chat': ['stream-chat', 'stream-chat-react'],
          'stream-video': ['@stream-io/video-react-sdk'],
          'emoji-vendor': ['emoji-mart', '@emoji-mart/data', '@emoji-mart/react'],
        },
      },
    },
  },
  server: {
    hmr: { overlay: false },
  },
})