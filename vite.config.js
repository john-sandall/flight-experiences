import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/flight-experiences/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        recommendations: resolve(__dirname, 'recommendations.html')
      }
    }
  }
})
