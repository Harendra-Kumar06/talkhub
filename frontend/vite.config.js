import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    // Gzip compression for older browsers
    viteCompression({ 
      algorithm: 'gzip', 
      ext: '.gz', 
      threshold: 10240,
      deleteOriginFile: false,
    }),
    // Brotli compression for modern browsers (better compression)
    viteCompression({ 
      algorithm: 'brotliCompress', 
      ext: '.br', 
      threshold: 10240,
      deleteOriginFile: false,
    }),
  ],
  
  build: {
    // Output directory
    outDir: 'dist',
    
    // Empty output dir before build
    emptyOutDir: true,
    
    // Minification
    minify: 'esbuild',
    cssMinify: true,
    
    // No source maps in production (smaller bundle)
    sourcemap: false,
    
    // Chunk size warnings
    chunkSizeWarningLimit: 2000,
    
    // Target modern browsers for better optimization
    target: 'es2020',
    
    // Assets inline threshold (4KB - inline smaller assets as base64)
    assetsInlineLimit: 4096,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'query-vendor': ['@tanstack/react-query', 'axios', 'zustand'],
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
          'stream-chat': ['stream-chat', 'stream-chat-react'],
          'stream-video': ['@stream-io/video-react-sdk'],
          'emoji-vendor': ['emoji-mart', '@emoji-mart/data', '@emoji-mart/react'],
        },
        
        // Naming for better cache invalidation
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          if (/mp3|wav|ogg|flac/i.test(ext)) {
            return `assets/audio/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
  
  // Dev server config
  server: {
    port: 5173,
    strictPort: false,
    open: false,
    hmr: { overlay: false },
    // Proxy API calls to backend in dev
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  // Preview server (for testing production build locally)
  preview: {
    port: 4173,
    strictPort: false,
    open: false,
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      '@tanstack/react-query',
      'axios',
      'zustand',
    ],
  },
})
