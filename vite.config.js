import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8080',
      '/providers': 'http://localhost:8080',
      '/slots': 'http://localhost:8080',
      '/appointments': 'http://localhost:8080',
      '/payments': 'http://localhost:8080',
      '/reviews': 'http://localhost:8080',
      '/notifications': 'http://localhost:8080',
      '/records': 'http://localhost:8080',
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    css: true,
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      all: true,
      include: [
        'src/App.jsx',
        'src/components/Layout.jsx',
        'src/context/ThemeContext.jsx',
        'src/utils/api.js',
        'src/pages/auth/**/*.jsx',
      ],
      exclude: [
        'tests/**',
      ],
      thresholds: {
        lines: 95,
      },
    },
  },
})
